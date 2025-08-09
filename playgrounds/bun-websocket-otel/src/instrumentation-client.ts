import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { ORPCInstrumentation } from '@orpc/otel'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'

const exporter = new OTLPTraceExporter({
  url: `${location.origin}/otel/traces`,
})

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    'service.name': 'bun-websocket-otel-playground-client',
  }),
  spanProcessors: [new BatchSpanProcessor(exporter)],
})

provider.register()

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new ORPCInstrumentation(),
  ],
})
