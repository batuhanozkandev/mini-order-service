const readinessSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    checks: {
      type: 'object',
      properties: {
        postgres: { type: 'string' },
        redis: { type: 'string' },
      },
      required: ['postgres', 'redis'],
    },
  },
  required: ['status', 'checks'],
};

export const liveSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
      },
      required: ['status'],
    },
  },
};

export const readySchema = {
  response: {
    200: readinessSchema,
    503: readinessSchema,
  },
};
