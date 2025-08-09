import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ORPCInstrumentation } from '@orpc/otel'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTEL_TRACE_EXPORTER_URL } from './consts'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { SpanStatusCode, trace } from '@opentelemetry/api'

const traceExporter = new OTLPTraceExporter({
  url: OTEL_TRACE_EXPORTER_URL,
})

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'bun-websocket-otel-playground-server',
  }),
  spanProcessors: [
    new BatchSpanProcessor(traceExporter),
  ],
  instrumentations: [
    getNodeAutoInstrumentations(),
    new ORPCInstrumentation(),
  ],
})

sdk.start()

const tracer = trace.getTracer('uncaught-errors')

function recordError(eventName: string, reason: unknown) {
  const span = tracer.startSpan(eventName)
  const message = String(reason)

  if (reason instanceof Error) {
    span.recordException(reason)
  }
  else {
    span.recordException({ message })
  }

  span.setStatus({ code: SpanStatusCode.ERROR, message })
  span.end()
}

process.on('uncaughtException', (reason) => {
  recordError('uncaughtException', reason)
})

process.on('unhandledRejection', (reason) => {
  recordError('unhandledRejection', reason)
})
