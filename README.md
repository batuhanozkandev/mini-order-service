# mini-order-service

A small order service: products, orders and payments, with a Postgres database, a Redis cache and distributed tracing.

Stack: Node.js 22, Fastify 5, TypeORM + Postgres 16, Redis (ioredis), OpenTelemetry + Jaeger, Pino, Vitest, Docker.

## How to run

```bash
docker compose up --build   # starts Postgres, Redis, Jaeger, runs migrations + seed, then starts the app on :3000
npm ci                      # in another terminal, install dependencies for the tests
npm test                    # runs the tests against the running Postgres and Redis
```

Try it (seeded product ids are fixed):

```bash
curl localhost:3000/products/11111111-1111-4111-8111-111111111111
curl -X PATCH localhost:3000/products/11111111-1111-4111-8111-111111111111 \
  -H 'content-type: application/json' -d '{"price": 69.90}'
curl -X POST localhost:3000/orders \
  -H 'content-type: application/json' \
  -d '{"productId": "33333333-3333-4333-8333-333333333333", "quantity": 1}'
curl localhost:3000/health/live
curl localhost:3000/health/ready
```

Traces: open the Jaeger UI at http://localhost:16686 and pick the service `mini-order-service`.

The 4K Monitor (`3333...`) has only 5 in stock, which makes it the easy one to run out of.

## Tests

- `test/orders.concurrency.test.ts`: 20 parallel orders for a product with stock 5. Exactly 5 get 201, 15 get 409, final stock is 0.
- `test/products.cache.test.ts`: first GET fills the cache, second GET is served from Redis, a PATCH deletes the key, the next GET is fresh.

Each test creates its own product and removes it at the end, so the tests can be run again and again.

## Design decisions

**Why Fastify.** Every route has a JSON Schema for params, body and responses. Fastify validates input with it (bad input gets a 400 before any of our code runs) and serializes output with it (only the declared fields leave the service, and serialization is fast). That gives validation and documentation of the API in one place, with no extra library.

**Why a pessimistic lock inside a transaction.** Two orders can read "stock = 1" at the same time and both decide to sell it. `POST /orders` therefore opens a transaction and reads the product with `SELECT ... FOR UPDATE`. The second order waits for the first to commit, then sees the new stock and gets a 409. The order, the payment and the stock change commit or roll back together. A `CHECK (stock >= 0)` constraint in the database is the safety net: even a bug in the code cannot make stock negative. The concurrency test proves this with 20 parallel requests. TODO(phase 2): confirm against src/services.

**Why cache-aside, delete-on-write and TTL jitter.** `GET /products/:id` looks in Redis first (key `product:{id}`), and on a miss reads Postgres and stores the result. On `PATCH` the code writes to Postgres and then deletes the key, instead of updating it, so there is no second copy of the logic that can drift. Deleting is also safe to repeat. The TTL is one hour plus a random 0 to 300 seconds. Without the random part, products cached at the same moment would all expire at the same moment and hit the database together. TODO(phase 2): confirm against src/routes.

**Liveness vs readiness.** `/health/live` only says the process is running and answers without touching anything else; if it fails, the container should be restarted. `/health/ready` checks Postgres and Redis and returns 503 if one is down; if it fails, traffic should be held back, but restarting the process would not help. Keeping them separate avoids restart loops when only a dependency is down. TODO(phase 2): confirm against src/routes.

**Multi-stage Docker build and non-root user.** The first stage installs all dependencies and compiles TypeScript. The final stage installs only production dependencies and copies in `dist/`, so the image has no compiler, no dev tools and no source. It runs as the `node` user instead of root, so a compromised process has fewer rights inside the container.

**How OpenTelemetry context propagation works.** `src/tracing.ts` (built to `dist/tracing.js`) is loaded with `node --require ./dist/tracing.js` so it runs before the app imports `http`, `pg` and `ioredis`, which is when they can be patched. The HTTP instrumentation reads an incoming W3C `traceparent` header, so a request from another service continues the same trace; without one it starts a new trace. Fastify spans come from `@fastify/otel`, because the auto-instrumentations package no longer includes Fastify. The active span is kept in Node's `AsyncLocalStorage`, which follows `await` chains, so the Postgres and Redis calls made while handling a request become child spans of that request without passing anything around by hand. A Pino `mixin` in `src/logger.ts` adds `trace_id` and `span_id` to every log line, so a log line can be searched for in Jaeger. Spans are exported over OTLP/HTTP to Jaeger.

## What I'd add in production

- **Kafka for order events.** Publish `OrderCreated` after the order is committed (with a transactional outbox, so the event is never lost or sent for a rolled-back order). Consumers such as shipping or email must be idempotent, because Kafka delivers at least once: they remember the event id and ignore duplicates.
- **Circuit breaker for an external payment provider.** Today a payment is just a row. With a real provider, calls would go through a circuit breaker (for example `opossum`) with a timeout, so a slow or failing provider fails fast instead of piling up requests and taking this service down with it.
- **Saga for payment failures.** An order touches several steps (reserve stock, charge, confirm). If the payment fails after stock was reserved, a compensating step gives the stock back and marks the order as failed, instead of one big distributed transaction.
