import { FastifyInstance } from 'fastify';
import { dataSource } from '../db/data-source';
import { Product } from '../entities/product.entity';
import { HttpError } from '../errors';
import { getProductSchema, patchProductSchema } from '../schemas/product.schema';
import { cacheProduct, getCachedProduct, invalidateProduct } from '../services/product-cache';

interface ProductParams {
  id: string;
}

interface PatchProductBody {
  price?: number;
  stock?: number;
}

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // Cache-aside: try Redis first, on a miss read from the DB and fill the cache.
  app.get<{ Params: ProductParams }>('/products/:id', { schema: getProductSchema }, async (request) => {
    const { id } = request.params;

    const cached = await getCachedProduct(id, request.log);
    if (cached) {
      return cached;
    }

    const product = await dataSource.manager.findOneBy(Product, { id });
    if (!product) {
      throw new HttpError(404, 'Product not found');
    }
    await cacheProduct(product, request.log);
    return product;
  });

  // Update the DB first, then delete the cache key, so the next GET reads the new values.
  app.patch<{ Params: ProductParams; Body: PatchProductBody }>(
    '/products/:id',
    { schema: patchProductSchema },
    async (request) => {
      const { id } = request.params;

      const result = await dataSource.manager.update(Product, { id }, request.body);
      if (result.affected === 0) {
        throw new HttpError(404, 'Product not found');
      }
      const product = await dataSource.manager.findOneByOrFail(Product, { id });
      await invalidateProduct(id, request.log);
      return product;
    },
  );
}
