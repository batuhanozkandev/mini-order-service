import { FastifyInstance } from 'fastify';
import { dataSource } from '../db/data-source';
import { redis } from '../redis';
import { liveSchema, readySchema } from '../schemas/health.schema';

// A readiness probe must answer quickly even if a dependency hangs, so every check gets a time limit.
const CHECK_TIMEOUT_MS = 1000;

async function check(dependency: Promise<unknown>): Promise<'up' | 'down'> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Health check timed out')), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([dependency, timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health/live', { schema: liveSchema }, async () => ({ status: 'ok' }));

  app.get('/health/ready', { schema: readySchema }, async (_request, reply) => {
    const [postgres, redisStatus] = await Promise.all([
      check(dataSource.query('SELECT 1')),
      check(redis.ping()),
    ]);
    const ready = postgres === 'up' && redisStatus === 'up';

    reply.code(ready ? 200 : 503);
    return { status: ready ? 'ok' : 'unavailable', checks: { postgres, redis: redisStatus } };
  });
}
