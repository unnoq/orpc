import type { StandardLazyRequest, StandardRequest } from '@orpc/standard-server'
import { parseBatchResponse, toBatchRequest } from '@orpc/standard-server/batch'
import { StandardHandler, StandardRPCMatcher } from '../adapters/standard'
import { BatchHandlerPlugin } from './batch'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('batchHandlerPlugin', () => {
  const interceptor = vi.fn(async ({ request, ...rest }) => {
    return {
      matched: true,
      response: { status: 200, headers: {}, body: await request.body() },
    } as any
  })

  const handler = new StandardHandler({}, new StandardRPCMatcher(), {} as any, {
    rootInterceptors: [interceptor],
    plugins: [new BatchHandlerPlugin()],
  })

  const request1: StandardRequest = { method: 'GET', url: new URL('http://localhost/prefix/foo'), headers: { 'x-request': '1' }, body: 'request1', signal: undefined }
  const request2: StandardRequest = { method: 'POST', url: new URL('http://localhost/prefix/foo2'), headers: { 'x-request': '2' }, body: 'request2', signal: AbortSignal.timeout(50) }
  const request3: StandardRequest = { method: 'DELETE', url: new URL('http://localhost/prefix/foo3'), headers: { 'x-request': '2' }, body: 'request3', signal: AbortSignal.timeout(100) }

  const lazyRequest1: StandardLazyRequest = { ...request1, body: () => Promise.resolve(request1.body) }
  const lazyRequest2: StandardLazyRequest = { ...request2, body: () => Promise.resolve(request2.body) }
  const lazyRequest3: StandardLazyRequest = { ...request3, body: () => Promise.resolve(request3.body) }

  it('works', async () => {
    interceptor.mockImplementation(async ({ request, ...rest }) => {
      return {
        matched: true as const,
        response: { status: 200, headers: {}, body: await request.body() },
      }
    })

    const request = toBatchRequest({
      url: new URL('http://localhost/prefix/__batch__'),
      headers: {
        'x-orpc-batch': '1',
      },
      method: 'POST',
      requests: [
        request1,
        request2,
        request3,
        request1,
      ],
    })

    const sleeps = [0, 100, 50, 120]

    interceptor.mockImplementation(async ({ request }) => {
      await new Promise(resolve => setTimeout(resolve, sleeps.shift()!))

      return {
        matched: true as const,
        response: { status: 200, headers: {}, body: await request.body() },
      }
    })

    const result = await handler.handle({ ...request, body: () => Promise.resolve(request.body) }, { prefix: '/prefix', context: { context: true } })

    expect(interceptor).toHaveBeenCalledTimes(4)
    expect(interceptor).toHaveBeenNthCalledWith(1, expect.objectContaining({
      request: {
        ...lazyRequest1,
        headers: {
          ...lazyRequest1.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))
    expect(interceptor).toHaveBeenNthCalledWith(2, expect.objectContaining({
      request: {
        ...lazyRequest2,
        headers: {
          ...lazyRequest2.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))
    expect(interceptor).toHaveBeenNthCalledWith(3, expect.objectContaining({
      request: {
        ...lazyRequest3,
        headers: {
          ...lazyRequest3.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))
    expect(interceptor).toHaveBeenNthCalledWith(4, expect.objectContaining({
      request: {
        ...lazyRequest1,
        headers: {
          ...lazyRequest1.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))

    expect(result.response?.status).toBe(207)
    expect(result.response?.headers).toEqual({})

    const parsed = parseBatchResponse(result.response!)

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 0,
        status: 200,
        headers: {},
        body: request1.body,
      },
    })

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 2,
        status: 200,
        headers: {},
        body: request3.body,
      },
    })

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 1,
        status: 200,
        headers: {},
        body: request2.body,
      },
    })

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 3,
        status: 200,
        headers: {},
        body: request1.body,
      },
    })

    await expect(parsed.next()).resolves.toEqual({ done: true })
  })

  it('can custom success status, headers, mapRequest', async () => {
    const successStatus = vi.fn(() => 201)
    const headers = vi.fn(() => ({ 'x-custom': '1' }))
    const mapRequestItem = vi.fn(request => request)

    const handler = new StandardHandler({}, new StandardRPCMatcher(), {} as any, {
      rootInterceptors: [interceptor],
      plugins: [
        new BatchHandlerPlugin({
          successStatus,
          headers,
          mapRequestItem,
        }),
      ],
    })

    const request = toBatchRequest({
      url: new URL('http://localhost/prefix/__batch__'),
      headers: {
        'x-orpc-batch': '1',
      },
      method: 'POST',
      requests: [
        request1,
        request2,
        request3,
        request1,
      ],
    })

    const response = await handler.handle({ ...request, body: () => Promise.resolve(request.body) }, { prefix: '/prefix', context: { context: true } })

    expect(response.response?.status).toBe(201)
    expect(response.response?.headers).toEqual({ 'x-custom': '1' })

    expect(successStatus).toHaveBeenCalledTimes(1)
    expect(successStatus).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      prefix: '/prefix',
      context: { context: true },
    }))

    expect(headers).toHaveBeenCalledTimes(1)
    expect(headers).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({
      prefix: '/prefix',
      context: { context: true },
    }))

    expect(mapRequestItem).toHaveBeenCalledTimes(4)
    expect(mapRequestItem).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      prefix: '/prefix',
      context: { context: true },
    }))
  })

  it('should ignore non batch requests', async () => {
    const result = await handler.handle(lazyRequest1, { prefix: '/prefix', context: { context: true } })

    expect(interceptor).toHaveBeenCalledTimes(1)
    expect(result).toBe(await interceptor.mock.results[0]!.value)
    expect(interceptor).toHaveBeenCalledWith(expect.objectContaining({
      request: lazyRequest1,
      prefix: '/prefix',
      context: { context: true },
    }))
  })

  it('should response error instead of throw on invalid batch', async () => {
    const request: StandardLazyRequest = {
      method: 'GET',
      url: new URL('http://localhost/prefix/foo'),
      headers: {
        'x-orpc-batch': '1',
      },
      body: () => Promise.resolve(''),
      signal: undefined,
    }

    const result = await handler.handle(request, { prefix: '/prefix', context: { context: true } })

    expect(interceptor).toHaveBeenCalledTimes(0)
    expect(result).toEqual({
      matched: true,
      response: {
        body: {
          code: 'BAD_REQUEST',
          data: undefined,
          defined: false,
          message: 'Invalid batch request, this could be caused by a malformed request body or a missing header',
          status: 400,
        },
        headers: {},
        status: 400,
      },
    })
  })

  it('should throw on unknown error', async () => {
    const handler = new StandardHandler({}, new StandardRPCMatcher(), {} as any, {
      interceptors: [interceptor],
      plugins: [new BatchHandlerPlugin({ mapRequestItem: (request) => {
        throw new Error('Unknown error')
      } })],
    })

    const request = toBatchRequest({
      url: new URL('http://localhost/prefix/__batch__'),
      headers: {
        'x-orpc-batch': '1',
      },
      method: 'POST',
      requests: [
        request1,
        request2,
      ],
    })

    await expect(
      handler.handle({ ...request, body: () => Promise.resolve(request.body) }, { prefix: '/prefix', context: { context: true } }),
    ).rejects.toThrow('Unknown error')

    expect(interceptor).toHaveBeenCalledTimes(0)
  })

  it('should response error instead of throw on request error and matched=false', async () => {
    const request = toBatchRequest({
      url: new URL('http://localhost/prefix/__batch__'),
      headers: {
        'x-orpc-batch': '1',
      },
      method: 'POST',
      requests: [
        request1,
        request2,
        request3,
        request1,
      ],
    })

    const sleeps = [0, 100, 50, 120]

    interceptor.mockImplementation(async ({ request }) => {
      const length = sleeps.length

      await new Promise(resolve => setTimeout(resolve, sleeps.shift()!))

      if (length % 2 === 0) {
        throw new Error('Unknown error')
      }

      return {
        matched: false,
        response: undefined,
      }
    })

    const result = await handler.handle({ ...request, body: () => Promise.resolve(request.body) }, { prefix: '/prefix', context: { context: true } })

    expect(interceptor).toHaveBeenCalledTimes(4)
    expect(interceptor).toHaveBeenNthCalledWith(1, expect.objectContaining({
      request: {
        ...lazyRequest1,
        headers: {
          ...lazyRequest1.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))
    expect(interceptor).toHaveBeenNthCalledWith(2, expect.objectContaining({
      request: {
        ...lazyRequest2,
        headers: {
          ...lazyRequest2.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))
    expect(interceptor).toHaveBeenNthCalledWith(3, expect.objectContaining({
      request: {
        ...lazyRequest3,
        headers: {
          ...lazyRequest3.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))
    expect(interceptor).toHaveBeenNthCalledWith(4, expect.objectContaining({
      request: {
        ...lazyRequest1,
        headers: {
          ...lazyRequest1.headers,
          'x-orpc-batch': '1',
        },
        body: expect.any(Function),
        signal: request.signal,
      },
      prefix: '/prefix',
      context: { context: true },
    }))

    const parsed = parseBatchResponse(result.response!)

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 0,
        status: 500,
        headers: {},
        body: {
          code: 'INTERNAL_SERVER_ERROR',
          defined: false,
          message: 'Internal server error',
          status: 500,
        },
      },
    })

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 2,
        status: 500,
        headers: {},
        body: {
          code: 'INTERNAL_SERVER_ERROR',
          defined: false,
          message: 'Internal server error',
          status: 500,
        },
      },
    })

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 1,
        status: 404,
        headers: {},
        body: {
          code: 'NOT_FOUND',
          data: undefined,
          defined: false,
          message: 'No procedure matched',
          status: 404,
        },
      },
    })

    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 3,
        status: 404,
        headers: {},
        body: {
          code: 'NOT_FOUND',
          data: undefined,
          defined: false,
          message: 'No procedure matched',
          status: 404,
        },
      },
    })

    await expect(parsed.next()).resolves.toEqual({ done: true })
  })
})
