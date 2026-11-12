import { errorSchema } from './error.schema';
import { uuidSchema } from './uuid.schema';

const paymentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    orderId: { type: 'string', format: 'uuid' },
    amount: { type: 'number' },
    status: { type: 'string' },
  },
  required: ['id', 'orderId', 'amount', 'status'],
};

const orderSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    productId: { type: 'string', format: 'uuid' },
    quantity: { type: 'integer' },
    status: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    payment: paymentSchema,
  },
  required: ['id', 'productId', 'quantity', 'status', 'createdAt', 'payment'],
};

export const createOrderSchema = {
  body: {
    type: 'object',
    properties: {
      productId: uuidSchema,
      // Max price (99,999,999.99) x 100 still fits payments.amount numeric(12,2).
      quantity: { type: 'integer', minimum: 1, maximum: 100 },
    },
    required: ['productId', 'quantity'],
    additionalProperties: false,
  },
  response: {
    201: orderSchema,
    400: errorSchema,
    404: errorSchema,
    409: errorSchema,
    500: errorSchema,
  },
};
