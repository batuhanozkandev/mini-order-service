import { FastifyBaseLogger } from 'fastify';
import { Product } from '../entities/product.entity';
import { redis } from '../redis';

// Redis problems never fail a request: the database is the source of truth, so we log a warning and carry on.

const TTL_SECONDS = 3600;
const MAX_JITTER_SECONDS = 300;

function cacheKey(productId: string): string {
  return `product:${productId}`;
}

export async function getCachedProduct(productId: string, log: FastifyBaseLogger): Promise<Product | null> {
  try {
    const cached = await redis.get(cacheKey(productId));
    // updatedAt comes back as an ISO string, not a Date. That's fine: it only goes to the
    // response serializer, which outputs both the same way.
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    log.warn({ err, productId }, 'Product cache read failed, using the database');
    return null;
  }
}

export async function cacheProduct(product: Product, log: FastifyBaseLogger): Promise<void> {
  // Random jitter so keys cached at the same moment don't all expire together and hit the database at once.
  const ttl = TTL_SECONDS + Math.floor(Math.random() * (MAX_JITTER_SECONDS + 1));
  try {
    await redis.set(cacheKey(product.id), JSON.stringify(product), 'EX', ttl);
  } catch (err) {
    log.warn({ err, productId: product.id }, 'Product cache write failed');
  }
}

export async function invalidateProduct(productId: string, log: FastifyBaseLogger): Promise<void> {
  try {
    await redis.del(cacheKey(productId));
  } catch (err) {
    // The DB change is already committed: answering 5xx now would make clients retry (and e.g. order twice).
    // The TTL bounds how long the stale cache entry can live.
    log.warn({ err, productId }, 'Product cache invalidation failed');
  }
}
