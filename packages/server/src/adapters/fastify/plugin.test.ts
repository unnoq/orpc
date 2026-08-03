import type { FastifyHandlerPlugin } from './plugin'
import { CompositeFastifyHandlerPlugin } from './plugin'

describe('compositeFastifyHandlerPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards initFastifyHandlerOptions and sorts plugins by dependencies', () => {
    const plugin1 = {
      name: 'plugin-1',
      initFastifyHandlerOptions: vi.fn((options: any) => options),
      after: ['plugin-2'],
    } satisfies FastifyHandlerPlugin<any>

    const plugin2 = {
      name: 'plugin-2',
      initFastifyHandlerOptions: vi.fn((options: any) => options),
      before: ['plugin-1'],
    } satisfies FastifyHandlerPlugin<any>

    const plugin3 = {
      name: 'plugin-3',
      initFastifyHandlerOptions: vi.fn((options: any) => options),
      after: ['plugin-1'],
    } satisfies FastifyHandlerPlugin<any>

    const composite = new CompositeFastifyHandlerPlugin([plugin1, plugin2, plugin3])
    const options = { fastifyInterceptors: [vi.fn()] }

    const result = composite.initFastifyHandlerOptions(options)

    expect(result).toBe(options)

    expect(plugin1.initFastifyHandlerOptions).toHaveBeenCalledOnce()
    expect(plugin2.initFastifyHandlerOptions).toHaveBeenCalledOnce()
    expect(plugin3.initFastifyHandlerOptions).toHaveBeenCalledOnce()

    expect(plugin2.initFastifyHandlerOptions).toHaveBeenCalledBefore(plugin1.initFastifyHandlerOptions)
    expect(plugin1.initFastifyHandlerOptions).toHaveBeenCalledBefore(plugin3.initFastifyHandlerOptions)
  })
})
