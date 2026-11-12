import { FastifyInstance } from 'fastify';
import { dataSource } from '../db/data-source';
import { Order } from '../entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { Product } from '../entities/product.entity';
import { HttpError } from '../errors';
import { createOrderSchema } from '../schemas/order.schema';
import { invalidateProduct } from '../services/product-cache';

interface CreateOrderBody {
  productId: string;
  quantity: number;
}

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateOrderBody }>('/orders', { schema: createOrderSchema }, async (request, reply) => {
    const { productId, quantity } = request.body;

    // One transaction: stock decrease, order and payment are saved together or not at all.
    // Throwing inside the callback (404/409) rolls everything back.
    const created = await dataSource.transaction(async (manager) => {
      // SELECT ... FOR UPDATE: concurrent orders for the same product wait here until we commit,
      // so each one sees the real remaining stock and we can never oversell.
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) {
        throw new HttpError(404, 'Product not found');
      }
      if (product.stock < quantity) {
        throw new HttpError(409, 'Insufficient stock');
      }

      await manager.update(Product, { id: productId }, { stock: product.stock - quantity });
      const order = await manager.save(Order, { productId, quantity, status: 'PENDING' });
      // Calculate in cents to avoid floating point drift (e.g. 0.1 * 3 = 0.30000000000000004).
      const amount = (Math.round(product.price * 100) * quantity) / 100;
      const payment = await manager.save(Payment, { orderId: order.id, amount, status: 'CREATED' });
      return { ...order, payment };
    });

    await invalidateProduct(productId, request.log);
    reply.code(201);
    return created;
  });
}
