import { config } from './config';
import { loggerOptions } from './logger';
import { buildApp } from './app';
import { dataSource } from './db/data-source';
import { redis } from './redis';
import { sdk } from './tracing';

async function main() {
  await dataSource.initialize();
  const app = buildApp({ logger: loggerOptions });
  // Without a listener ioredis prints unhandled "error" events to stderr; send them through pino instead.
  redis.on('error', (err) => app.log.warn({ err }, 'Redis connection error'));

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down');
    // Safety net: never hang forever (compose sends SIGKILL after 10s anyway).
    setTimeout(() => process.exit(1), 8000).unref();

    await app.close(); // stop accepting connections, let in-flight requests finish
    app.log.info('HTTP server closed');
    await dataSource.destroy();
    app.log.info('Postgres connection closed');
    await redis.quit();
    app.log.info('Redis connection closed');
    await sdk.shutdown(); // flush pending spans
    app.log.info('Tracing flushed, bye');
    process.exit(0);
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err) => {
  console.error('Startup failed', err);
  process.exit(1);
});
