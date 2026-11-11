import { dataSource } from './data-source';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const migrations = await dataSource.runMigrations();
    if (migrations.length === 0) {
      console.log('No pending migrations');
    }
    for (const migration of migrations) {
      console.log(`Ran migration ${migration.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
