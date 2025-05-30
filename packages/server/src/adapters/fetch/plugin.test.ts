import type { FetchHandlerPlugin } from './plugin'
import { CompositeFetchHandlerPlugin } from './plugin'

describe('compositeFetchHandlerPlugin', () => {
  it('forward initRuntimeAdapter and sort plugins', () => {
    const plugin1 = {
      initRuntimeAdapter: vi.fn(),
      order: 1,
    } satisfies FetchHandlerPlugin<any>
    const plugin2 = {
      initRuntimeAdapter: vi.fn(),
    } satisfies FetchHandlerPlugin<any>
    const plugin3 = {
      initRuntimeAdapter: vi.fn(),
      order: -1,
    } satisfies FetchHandlerPlugin<any>

    const compositePlugin = new CompositeFetchHandlerPlugin([plugin1, plugin2, plugin3])

    const interceptor = vi.fn()

    const options = { adapterInterceptors: [interceptor] }

    compositePlugin.initRuntimeAdapter(options)

    expect(plugin1.initRuntimeAdapter).toHaveBeenCalledOnce()
    expect(plugin2.initRuntimeAdapter).toHaveBeenCalledOnce()
    expect(plugin3.initRuntimeAdapter).toHaveBeenCalledOnce()

    expect(plugin1.initRuntimeAdapter.mock.calls[0]![0]).toBe(options)
    expect(plugin2.initRuntimeAdapter.mock.calls[0]![0]).toBe(options)
    expect(plugin3.initRuntimeAdapter.mock.calls[0]![0]).toBe(options)

    expect(plugin3.initRuntimeAdapter).toHaveBeenCalledBefore(plugin2.initRuntimeAdapter)
    expect(plugin2.initRuntimeAdapter).toHaveBeenCalledBefore(plugin1.initRuntimeAdapter)
  })
})
