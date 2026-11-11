import { dataSource } from './data-source';

// Fixed ids so the README, curl examples and tests can always refer to the same products.
const products = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Mechanical Keyboard', price: 79.9, stock: 100 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Wireless Mouse', price: 24.99, stock: 200 },
  // Low stock on purpose, to demo the "Insufficient stock" (409) case quickly.
  { id: '33333333-3333-4333-8333-333333333333', name: '4K Monitor', price: 349, stock: 5 },
];

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    for (const product of products) {
      // DO NOTHING (not an update): the seed runs on every `docker compose up`
      // and must not reset stock that demo orders have already changed.
      const inserted = await dataSource.query(
        `INSERT INTO products (id, name, price, stock)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [product.id, product.name, product.price, product.stock],
      );
      console.log(`${inserted.length ? 'Inserted' : 'Already exists'}: ${product.name} (${product.id})`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
