import { afterAll, beforeAll, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { dataSource } from '../src/db/data-source';
import { redis } from '../src/redis';

let app: FastifyInstance;
let productId: string;
let cacheKey: string;

beforeAll(async () => {
  await dataSource.initialize();
  // The Redis client has no offline queue, so commands sent before the connection is ready would fail.
  if (redis.status !== 'ready') await new Promise((resolve) => redis.once('ready', resolve));
  app = buildApp({ logger: false });
  const rows = await dataSource.query(
    `INSERT INTO products (name, price, stock) VALUES ('Cache test product', 10.00, 50) RETURNING id`,
  );
  productId = rows[0].id;
  cacheKey = `product:${productId}`;
});

afterAll(async () => {
  await dataSource.query(`DELETE FROM products WHERE id = $1`, [productId]);
  await redis.del(cacheKey);
  await app.close();
  await dataSource.destroy();
  await redis.quit();
});

const getProduct = () => app.inject({ method: 'GET', url: `/products/${productId}` });

it('cache-aside: miss fills the cache, hit serves from Redis, PATCH invalidates', async () => {
  // Step 1: nothing is cached yet.
  expect(await redis.exists(cacheKey)).toBe(0);

  // Step 2: first GET is a miss, so it reads Postgres and fills Redis (TTL 3600s + up to 300s jitter).
  const first = await getProduct();
  expect(first.statusCode).toBe(200);
  expect(first.json().price).toBe(10);
  expect(await redis.exists(cacheKey)).toBe(1);
  const ttl = await redis.ttl(cacheKey);
  expect(ttl).toBeGreaterThanOrEqual(3600);
  expect(ttl).toBeLessThanOrEqual(3900);

  // Step 3: change the row directly in Postgres, behind the cache's back.
  await dataSource.query(`UPDATE products SET price = 20.00 WHERE id = $1`, [productId]);

  // Step 4: second GET still returns the OLD price, so it came from Redis (a hit).
  const second = await getProduct();
  expect(second.json().price).toBe(10);

  // Step 5: PATCH through the API writes to Postgres and deletes the cache key.
  const patch = await app.inject({
    method: 'PATCH',
    url: `/products/${productId}`,
    payload: { price: 30 },
  });
  expect(patch.statusCode).toBe(200);
  expect(await redis.exists(cacheKey)).toBe(0);

  // Step 6: the next GET is a miss again and returns the fresh price.
  const third = await getProduct();
  expect(third.json().price).toBe(30);
});
