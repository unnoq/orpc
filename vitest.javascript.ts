import { trace } from '@opentelemetry/api'
import { setTracer } from './packages/shared/src'

beforeAll(() => {
  setTracer(trace.getTracer('orpc-test'))
})
