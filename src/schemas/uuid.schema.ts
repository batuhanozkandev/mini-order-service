// Only the canonical lowercase form (what Postgres returns, and what the cache key uses).
// `format: 'uuid'` would also accept "urn:uuid:..." (a DB error, 500) and upper case (a different cache key).
export const uuidSchema = {
  type: 'string',
  pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
};
