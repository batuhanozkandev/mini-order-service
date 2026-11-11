import 'reflect-metadata';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { dataSource } from '../src/db/data-source';
import { redis } from '../src/redis';

let app: FastifyInstance;
let productId: string;

beforeAll(async () => {
  await dataSource.initialize();
  app = buildApp({ logger: false });
  // The test creates its own product, so it never touches the seeded ones.
  const rows = await dataSource.query(
    `INSERT INTO products (name, price, stock) VALUES ('Concurrency test product', 10.00, 5) RETURNING id`,
  );
  productId = rows[0].id;
});

afterAll(async () => {
  // Delete in foreign key order: payments -> orders -> product.
  await dataSource.query(
    `DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE product_id = $1)`,
    [productId],
  );
  await dataSource.query(`DELETE FROM orders WHERE product_id = $1`, [productId]);
  await dataSource.query(`DELETE FROM products WHERE id = $1`, [productId]);
  await redis.del(`product:${productId}`);
  await app.close();
  await dataSource.destroy();
  await redis.quit();
});

it('20 parallel orders for 5 items in stock: exactly 5 succeed, 15 get 409, stock ends at 0', async () => {
  // Promise.all starts all 20 requests at once, so they really compete for the same row.
  const responses = await Promise.all(
    Array.from({ length: 20 }, () =>
      app.inject({ method: 'POST', url: '/orders', payload: { productId, quantity: 1 } }),
    ),
  );

  const statuses = responses.map((r) => r.statusCode);
  expect(statuses.filter((s) => s === 201)).toHaveLength(5);
  expect(statuses.filter((s) => s === 409)).toHaveLength(15);

  const [product] = await dataSource.query(`SELECT stock FROM products WHERE id = $1`, [productId]);
  expect(product.stock).toBe(0);
});
