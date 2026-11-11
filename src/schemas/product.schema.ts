import { errorSchema } from './error.schema';

const productSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    price: { type: 'number' },
    stock: { type: 'integer' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'price', 'stock', 'updatedAt'],
};

const productParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
  required: ['id'],
};

export const getProductSchema = {
  params: productParamsSchema,
  response: {
    200: productSchema,
    400: errorSchema,
    404: errorSchema,
    500: errorSchema,
  },
};

export const patchProductSchema = {
  params: productParamsSchema,
  body: {
    type: 'object',
    properties: {
      // Maximums match the DB columns (numeric(10,2) and integer), so too-large values are a 400, not a DB error.
      price: { type: 'number', exclusiveMinimum: 0, maximum: 99999999.99 },
      stock: { type: 'integer', minimum: 0, maximum: 2147483647 },
    },
    minProperties: 1,
    additionalProperties: false,
  },
  response: {
    200: productSchema,
    400: errorSchema,
    404: errorSchema,
    500: errorSchema,
  },
};
