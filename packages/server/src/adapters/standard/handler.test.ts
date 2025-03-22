import { ORPCError } from '@orpc/contract'
import { ping, router } from '../../../tests/shared'
import { createProcedureClient } from '../../procedure-client'
import { StandardHandler } from './handler'

vi.mock('../../procedure-client', () => ({
  createProcedureClient: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('standardHandler', () => {
  const matcher = {
    init: vi.fn(),
    match: vi.fn(),
  }

  const codec = {
    encode: vi.fn(),
    encodeError: vi.fn(),
    decode: vi.fn(),
  }

  const interceptor = vi.fn(({ next }) => next())
  const interceptorRoot = vi.fn(({ next }) => next())

  const handler = new StandardHandler(router, matcher, codec, {
    interceptors: [interceptor],
    rootInterceptors: [interceptorRoot],
  })

  const controller = new AbortController()
  const signal = controller.signal

  const request = {
    raw: {},
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    url: new URL('http://localhost/api/v1/users/1'),
    body: vi.fn(),
    signal,
  }

  const response = {
    headers: {
      'x-orpc': '1',
    },
    body: '__output__',
  }

  it('should call matcher.init once', async () => {
    const handler = new StandardHandler(router, matcher, codec, {})
    expect(matcher.init).toHaveBeenCalledOnce()
    expect(matcher.init).toHaveBeenCalledWith(router)
  })

  it('on mismatch', async () => {
    matcher.match.mockResolvedValue(undefined)

    const result = await handler.handle(request, {
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(matcher.match).toHaveBeenCalledOnce()
    expect(matcher.match).toHaveBeenCalledWith('GET', '/users/1')

    expect(createProcedureClient).not.toHaveBeenCalled()
    expect(codec.decode).not.toHaveBeenCalled()
    expect(codec.encode).not.toHaveBeenCalled()
    expect(codec.encodeError).not.toHaveBeenCalled()

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(interceptorRoot).toHaveBeenCalledOnce()
    expect(interceptorRoot).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })
  })

  it('on success', async () => {
    matcher.match.mockResolvedValue({
      path: ['ping'],
      procedure: ping,
      params: { id: '__id__' },
    })

    const client = vi.fn().mockReturnValueOnce('__output__')
    vi.mocked(createProcedureClient).mockReturnValueOnce(client)

    codec.decode.mockReturnValueOnce('__input__')

    codec.encode.mockReturnValueOnce(response)

    const result = await handler.handle(request, {
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(result).toEqual({ matched: true, response })

    expect(matcher.match).toHaveBeenCalledOnce()
    expect(matcher.match).toHaveBeenCalledWith('GET', '/users/1')

    expect(createProcedureClient).toHaveBeenCalledOnce()
    expect(createProcedureClient).toHaveBeenCalledWith(ping, {
      context: { db: 'postgres' },
      path: ['ping'],
    })

    expect(codec.decode).toHaveBeenCalledOnce()
    expect(codec.decode).toHaveBeenCalledWith(request, { id: '__id__' }, ping)

    expect(client).toHaveBeenCalledOnce()
    expect(client).toHaveBeenCalledWith('__input__', { signal })

    expect(codec.encode).toHaveBeenCalledOnce()
    expect(codec.encode).toHaveBeenCalledWith('__output__', ping)

    expect(codec.encodeError).not.toHaveBeenCalled()

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(interceptorRoot).toHaveBeenCalledOnce()
    expect(interceptorRoot).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })
  })

  it('on error', async () => {
    matcher.match.mockResolvedValue({
      path: ['ping'],
      procedure: ping,
      params: { id: '__id__' },
    })

    const error = new ORPCError('BAD_GATEWAY')
    const client = vi.fn().mockRejectedValueOnce(error)
    vi.mocked(createProcedureClient).mockReturnValueOnce(client)

    codec.decode.mockReturnValueOnce('__input__')

    codec.encodeError.mockReturnValueOnce(response)

    const result = await handler.handle(request, {
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(result).toEqual({ matched: true, response })

    expect(matcher.match).toHaveBeenCalledOnce()
    expect(matcher.match).toHaveBeenCalledWith('GET', '/users/1')

    expect(createProcedureClient).toHaveBeenCalledOnce()
    expect(createProcedureClient).toHaveBeenCalledWith(ping, {
      context: { db: 'postgres' },
      path: ['ping'],
    })

    expect(codec.decode).toHaveBeenCalledOnce()
    expect(codec.decode).toHaveBeenCalledWith(request, { id: '__id__' }, ping)

    expect(client).toHaveBeenCalledOnce()
    expect(client).toHaveBeenCalledWith('__input__', { signal })

    expect(codec.encode).not.toBeCalled()

    expect(codec.encodeError).toHaveBeenCalledOnce()
    expect(codec.encodeError).toHaveBeenCalledWith(error)

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(interceptorRoot).toHaveBeenCalledOnce()
    expect(interceptorRoot).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })
  })

  it('on decode error', async () => {
    matcher.match.mockResolvedValue({
      path: ['ping'],
      procedure: ping,
      params: { id: '__id__' },
    })

    const error = new Error('Something bad')
    codec.decode.mockRejectedValueOnce(error)
    const client = vi.fn()
    vi.mocked(createProcedureClient).mockReturnValueOnce(client)

    codec.decode.mockReturnValueOnce('__input__')

    codec.encodeError.mockReturnValueOnce(response)

    const result = await handler.handle(request, {
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(result).toEqual({ matched: true, response })

    expect(matcher.match).toHaveBeenCalledOnce()
    expect(matcher.match).toHaveBeenCalledWith('GET', '/users/1')

    expect(createProcedureClient).toHaveBeenCalledOnce()
    expect(createProcedureClient).toHaveBeenCalledWith(ping, {
      context: { db: 'postgres' },
      path: ['ping'],
    })

    expect(codec.decode).toHaveBeenCalledOnce()
    expect(codec.decode).toHaveBeenCalledWith(request, { id: '__id__' }, ping)

    expect(client).not.toHaveBeenCalledOnce()
    expect(codec.encode).not.toBeCalled()

    expect(codec.encodeError).toHaveBeenCalledOnce()
    expect(codec.encodeError.mock.calls[0]![0]).toSatisfy((e: any) => {
      expect(e).toBeInstanceOf(ORPCError)
      expect(e.code).toEqual('BAD_REQUEST')
      expect(e.message).toEqual(
        `Malformed request. Ensure the request body is properly formatted and the 'Content-Type' header is set correctly.`,
      )
      expect(e.cause).toEqual(error)

      return true
    })

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })

    expect(interceptorRoot).toHaveBeenCalledOnce()
    expect(interceptorRoot).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: { db: 'postgres' },
      prefix: '/api/v1',
    })
  })

  it('work without context and prefix', async () => {
    matcher.match.mockResolvedValue({
      path: ['ping'],
      procedure: ping,
    })

    const client = vi.fn().mockReturnValueOnce('__output__')
    vi.mocked(createProcedureClient).mockReturnValueOnce(client)
    codec.encode.mockReturnValueOnce(response)

    const result = await (handler as any).handle(request)

    expect(result).toEqual({ matched: true, response })

    expect(matcher.match).toHaveBeenCalledOnce()
    expect(matcher.match).toHaveBeenCalledWith('GET', '/api/v1/users/1')

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: {},
    })

    expect(interceptorRoot).toHaveBeenCalledOnce()
    expect(interceptorRoot).toHaveBeenCalledWith({
      request,
      next: expect.any(Function),
      context: {},
    })
  })

  it('works without options', async () => {
    matcher.match.mockResolvedValue({
      path: ['ping'],
      procedure: ping,
      params: { id: '__id__' },
    })

    const handler = new StandardHandler(router, matcher, codec, {})

    expect(await handler.handle(request, { context: { db: 'postgres' } })).toEqual({
      matched: true,
      response: undefined,
    })
  })

  it.each([
    '123456',
    ['should-ignore', '123456'],
  ])('works with lastEventId', async (headerValue) => {
    matcher.match.mockResolvedValue({
      path: ['ping'],
      procedure: ping,
      params: { id: '__id__' },
    })

    const handler = new StandardHandler(router, matcher, codec, {})
    const client = vi.fn().mockReturnValueOnce('__output__')
    vi.mocked(createProcedureClient).mockReturnValueOnce(client)

    await handler.handle({
      ...request,
      headers: {
        'last-event-id': headerValue,
      },
    }, { context: { db: 'postgres' }, prefix: '/api/v1' })

    expect(client).toHaveBeenCalledOnce()
    expect(client).toHaveBeenCalledWith(undefined, expect.objectContaining({ lastEventId: '123456' }))
  })

  it('should check prefix first', async () => {
    const result = await handler.handle({
      raw: {},
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      url: new URL('http://localhost/users/1'),
      body: vi.fn(),
      signal,
    }, {
      context: { db: 'postgres' },
      prefix: '/invalid',
    })

    expect(result).toEqual({ matched: false, response: undefined })
  })
})
