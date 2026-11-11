// Loaded with `node --require ./dist/tracing.js` so the instrumentations can patch
// http, pg and ioredis before the application imports them.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { FastifyOtelInstrumentation } from '@fastify/otel';

// Only the instrumentations we need; the auto bundle ships ~40 and some (fs, dns, net) are very noisy.
process.env.OTEL_NODE_ENABLED_INSTRUMENTATIONS ??= 'http,pg,ioredis';
process.env.OTEL_SERVICE_NAME ??= 'mini-order-service';

export const sdk = new NodeSDK({
  // Reads OTEL_EXPORTER_OTLP_ENDPOINT and appends /v1/traces.
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations(),
    // registerOnInitialization hooks every Fastify instance automatically, no change in app.ts.
    new FastifyOtelInstrumentation({ registerOnInitialization: true }),
  ],
});

sdk.start();
