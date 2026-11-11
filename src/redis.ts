import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis(config.redisUrl, {
  // While Redis is unreachable, reject commands right away instead of queueing them until it comes back:
  // the product cache then falls back to the database, and /health/ready reports "down" immediately.
  enableOfflineQueue: false,
  // Don't let a command hang on a slow or half-dead connection.
  commandTimeout: 500,
});
