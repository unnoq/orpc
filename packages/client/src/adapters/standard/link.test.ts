import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import { StandardLink } from './link'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('standardLink', () => {
  const codec = { encode: vi.fn(), decode: vi.fn() }
  const client = { call: vi.fn() }

  it('workflow is correct', async () => {
    const interceptor = vi.fn(({ next }) => next())
    const clientInterceptor = vi.fn(({ next }) => next())

    const link = new StandardLink(codec, client, {
      interceptors: [interceptor],
      clientInterceptors: [clientInterceptor],
    })

    const __standardRequest: StandardRequest = {
      method: 'POST',
      url: new URL('http://localhost:3000'),
      headers: {},
      body: '__standard_request__',
      signal: AbortSignal.timeout(100),
    }

    const __standardResponse: StandardResponse = {
      status: 200,
      headers: {},
      body: '__standard_response__',
    }

    codec.encode.mockReturnValueOnce(__standardRequest)
    client.call.mockResolvedValueOnce(__standardResponse)
    codec.decode.mockReturnValueOnce('__output__')

    const context = { context: true }
    const signal = AbortSignal.timeout(100)
    const lastEventId = '__lastEventId__'

    const output = await link.call(['planet', 'create'], { name: 'Earth' }, { context, signal, lastEventId })

    expect(output).toEqual('__output__')

    expect(codec.encode).toHaveBeenCalledTimes(1)
    expect(codec.encode).toHaveBeenCalledWith(['planet', 'create'], { name: 'Earth' }, { context, signal, lastEventId })

    expect(client.call).toHaveBeenCalledTimes(1)
    expect(client.call).toHaveBeenCalledWith(__standardRequest, { context, signal, lastEventId }, ['planet', 'create'], { name: 'Earth' })

    expect(codec.decode).toHaveBeenCalledTimes(1)
    expect(codec.decode).toHaveBeenCalledWith(__standardResponse, { context, signal, lastEventId }, ['planet', 'create'], { name: 'Earth' })

    expect(interceptor).toHaveBeenCalledTimes(1)
    expect(interceptor).toHaveBeenCalledWith({
      next: expect.any(Function),
      path: ['planet', 'create'],
      input: { name: 'Earth' },
      context,
      signal,
      lastEventId,
    })

    expect(clientInterceptor).toHaveBeenCalledTimes(1)
    expect(clientInterceptor).toHaveBeenCalledWith({
      next: expect.any(Function),
      request: __standardRequest,
      path: ['planet', 'create'],
      input: { name: 'Earth' },
      context,
      signal,
      lastEventId,
    })
  })

  it('plugins', () => {
    const init = vi.fn()

    const options = {
      plugins: [
        { init },
      ],
      interceptors: [vi.fn()],
      clientInterceptors: [vi.fn()],
    }
    const link = new StandardLink(codec, client, options)

    expect(init).toHaveBeenCalledOnce()
    expect(init).toHaveBeenCalledWith(options)
  })
})
