const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port)) {
  throw new Error(`PORT must be a number, got "${process.env.PORT}"`);
}

export const config = {
  port,
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
