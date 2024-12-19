import type { Procedure } from '../procedure'
import type { WELL_CONTEXT } from '../types'
import { lazy } from '../lazy'
import { handleFetchRequest } from './handle-request'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleFetchRequest', () => {
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, undefined, undefined, undefined>
  const pong = {} as Procedure<WELL_CONTEXT, { db: string }, undefined, undefined, undefined>

  const router = {
    ping: lazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: lazy(() => Promise.resolve({ default: {
      ping,
      pong: lazy(() => Promise.resolve({ default: pong })),
    } })),
  }

  const handler1 = vi.fn()

  it('forward request to handlers', async () => {
    const options = {
      request: {} as Request,
      router,
      handlers: [handler1],
      context: { auth: true },
    } as const

    const mockedResponse = new Response('__mocked__')
    handler1.mockReturnValueOnce(mockedResponse)

    const response = await handleFetchRequest(options)

    expect(response).toBe(mockedResponse)

    expect(handler1).toBeCalledTimes(1)
    expect(handler1).toBeCalledWith(options)
  })

  it('try all handlers utils return response', async () => {
    const handler2 = vi.fn()
    const handler3 = vi.fn()

    const options = {
      request: {} as Request,
      router,
      handlers: [handler1, handler2, handler3],
      context: { auth: true },
    } as const

    const mockedResponse = new Response('__mocked__')
    handler2.mockReturnValueOnce(mockedResponse)

    const response = await handleFetchRequest(options)

    expect(response).toBe(mockedResponse)

    expect(handler1).toBeCalledTimes(1)
    expect(handler1).toBeCalledWith(options)
    expect(handler2).toBeCalledTimes(1)
    expect(handler2).toBeCalledWith(options)
    expect(handler3).toBeCalledTimes(0)
  })

  it('fallback 404 if no handler return response', async () => {
    const handler2 = vi.fn()
    const handler3 = vi.fn()

    const options = {
      request: {} as Request,
      router,
      handlers: [handler1, handler2, handler3],
      context: { auth: true },
    } as const

    const response = await handleFetchRequest(options)

    expect(handler1).toBeCalledTimes(1)
    expect(handler2).toBeCalledTimes(1)
    expect(handler3).toBeCalledTimes(1)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      code: 'NOT_FOUND',
      message: 'Not found',
      status: 404,
    })
  })
})
