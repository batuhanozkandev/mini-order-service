import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { errorHandler, notFoundHandler } from './errors';
import { healthRoutes } from './routes/health';
import { orderRoutes } from './routes/orders';
import { productRoutes } from './routes/products';

// Builds the app without connecting to anything or listening, so server.ts and tests can both use it.
export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    ...opts,
    // Fastify's defaults silently drop unknown properties and coerce types (e.g. "5" -> 5).
    // We want a 400 for those instead.
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.register(productRoutes);
  app.register(orderRoutes);
  app.register(healthRoutes);

  return app;
}
