import { trace } from '@opentelemetry/api';
import { config } from './config';

// Adds trace_id/span_id to every log line so logs can be matched to traces in Jaeger.
export const loggerOptions = {
  level: config.logLevel,
  mixin() {
    const ctx = trace.getActiveSpan()?.spanContext();
    return ctx ? { trace_id: ctx.traceId, span_id: ctx.spanId } : {};
  },
};
