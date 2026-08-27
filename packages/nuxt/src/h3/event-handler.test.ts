import * as h3 from 'h3'
import { defineORPCEventHandler } from './event-handler'

vi.mock('h3', () => ({
  defineEventHandler: vi.fn(fn => fn),
  toWebRequest: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('defineORPCEventHandler', () => {
  const handler = { handle: vi.fn() } as any
  const request = new Request('https://example.com/rpc/ping', { method: 'POST' })
  const response = new Response('__response__')

  it('converts h3 v1 events with toWebRequest', async () => {
    vi.mocked(h3.toWebRequest).mockReturnValueOnce(request)
    handler.handle.mockResolvedValueOnce({ matched: true, response })

    const event = { node: {} } as any
    const eventHandler = defineORPCEventHandler(handler, { prefix: '/rpc' })

    expect(h3.defineEventHandler).toHaveBeenCalledTimes(1)
    await expect((eventHandler as any)(event)).resolves.toBe(response)

    expect(h3.toWebRequest).toHaveBeenCalledTimes(1)
    expect(h3.toWebRequest).toHaveBeenCalledWith(event)
    expect(handler.handle).toHaveBeenCalledTimes(1)
    expect(handler.handle).toHaveBeenCalledWith(request, { prefix: '/rpc', context: {} })
  })

  it('uses the web request directly on h3 v2 events', async () => {
    handler.handle.mockResolvedValueOnce({ matched: true, response })

    const event = { req: request } as any
    const eventHandler = defineORPCEventHandler(handler)

    await expect((eventHandler as any)(event)).resolves.toBe(response)

    expect(h3.toWebRequest).not.toHaveBeenCalled()
    expect(handler.handle).toHaveBeenCalledWith(request, { context: {} })
  })

  it('resolves the context value with the event', async () => {
    handler.handle.mockResolvedValue({ matched: true, response })

    const event = { req: request } as any

    const staticContext = defineORPCEventHandler(handler, { context: { user: '__user__' } })
    await (staticContext as any)(event)
    expect(handler.handle).toHaveBeenLastCalledWith(request, { context: { user: '__user__' } })

    const fnContext = vi.fn(async (event: any) => ({ user: event.__user__ }))
    const dynamicContext = defineORPCEventHandler(handler, { context: fnContext })
    await (dynamicContext as any)({ ...event, __user__: '__dynamic__' })
    expect(fnContext).toHaveBeenCalledTimes(1)
    expect(handler.handle).toHaveBeenLastCalledWith(request, { context: { user: '__dynamic__' } })
  })

  it('responds 404 when no procedure matches', async () => {
    handler.handle.mockResolvedValueOnce({ matched: false })

    const event = { req: request } as any
    const eventHandler = defineORPCEventHandler(handler)

    const result: Response = await (eventHandler as any)(event)

    expect(result).toBeInstanceOf(Response)
    expect(result.status).toBe(404)
    await expect(result.text()).resolves.toBe('Not Found')
  })
})
