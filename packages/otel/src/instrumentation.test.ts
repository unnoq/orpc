import * as shared from '@orpc/shared'
import { ORPCInstrumentation } from './instrumentation'

const setGlobalOtelConfigSpy = vi.spyOn(shared, 'setGlobalOtelConfig')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('oRPCInstrumentation', () => {
  it('should initialize the instrumentation', () => {
    const originalConfig = shared.getGlobalOtelConfig()

    const instrumentation = new ORPCInstrumentation()
    expect(setGlobalOtelConfigSpy).toHaveBeenCalledWith(expect.any(Object))

    shared.setGlobalOtelConfig(originalConfig)
  })

  it('should not set a tracer if enabled=false', () => {
    const originalConfig = shared.getGlobalOtelConfig()

    const instrumentation = new ORPCInstrumentation({ enabled: false })
    expect(setGlobalOtelConfigSpy).not.toHaveBeenCalled()

    shared.setGlobalOtelConfig(originalConfig)
  })

  it('can disable the instrumentation', () => {
    const originalConfig = shared.getGlobalOtelConfig()

    const instrumentation = new ORPCInstrumentation()
    instrumentation.disable()
    expect(setGlobalOtelConfigSpy).toHaveBeenCalledWith(undefined)

    shared.setGlobalOtelConfig(originalConfig)
  })
})
