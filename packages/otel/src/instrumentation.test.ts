import * as shared from '@orpc/shared'
import { ORPCInstrumentation } from './instrumentation'

const setTracerSpy = vi.spyOn(shared, 'setTracer')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('oRPCInstrumentation', () => {
  it('should initialize the instrumentation', () => {
    const originalTracer = shared.getTracer()

    const instrumentation = new ORPCInstrumentation()
    expect(setTracerSpy).toHaveBeenCalledWith(expect.any(Object))

    shared.setTracer(originalTracer)
  })

  it('should not set a tracer if enabled=false', () => {
    const originalTracer = shared.getTracer()

    const instrumentation = new ORPCInstrumentation({ enabled: false })
    expect(setTracerSpy).not.toHaveBeenCalled()

    shared.setTracer(originalTracer)
  })
})
