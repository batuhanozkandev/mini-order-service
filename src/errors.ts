import { STATUS_CODES } from 'node:http';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function errorBody(statusCode: number, message: string) {
  return { error: STATUS_CODES[statusCode] ?? 'Error', message };
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  const statusCode = error.statusCode ?? 500;

  // Client errors: our HttpErrors, schema validation (400) and Fastify's own (bad JSON, wrong content type, ...).
  if (statusCode >= 400 && statusCode < 500) {
    reply.code(statusCode).send(errorBody(statusCode, error.message));
    return;
  }

  // Anything else is a bug or an outage: log the details, but never send internals to the client.
  request.log.error({ err: error }, 'Unhandled error');
  reply.code(500).send(errorBody(500, 'Unexpected error'));
}

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  reply.code(404).send(errorBody(404, `Route ${request.method} ${request.url} not found`));
}
