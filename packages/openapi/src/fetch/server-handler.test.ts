import { os } from '@orpc/server'
import { z } from 'zod'
import { createOpenAPIServerHandler } from './server-handler'
import { createOpenAPIServerlessHandler } from './serverless-handler'

const handlers = [createOpenAPIServerHandler(), createOpenAPIServerlessHandler()]
describe.each(handlers)('openAPIServerHandler', (handler) => {
  const ping = os.input(z.object({ value: z.string() })).output(z.string()).func((input) => {
    return input.value
  })
  const pong = os.func(() => 'pong')

  const lazyRouter = os.lazy(() => Promise.resolve({
    default: {
      ping: os.lazy(() => Promise.resolve({ default: ping })),
      pong,
      lazyRouter: os.lazy(() => Promise.resolve({ default: { ping, pong } })),
    },
  }))

  const router = os.router({
    ping,
    pong,
    lazyRouter,
  })

  it('should handle request', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: '123' }),
      }),
    })

    expect(response?.status).toEqual(200)
    expect(await response?.json()).toEqual('123')
  })

  it('should handle request - lazy', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/lazyRouter/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: '123' }),
      }),
    })

    expect(response?.status).toEqual(200)
    expect(await response?.json()).toEqual('123')
  })

  it('should handle request - lazy - lazy', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/lazyRouter/lazyRouter/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: '123' }),
      }),
    })

    expect(response?.status).toEqual(200)
    expect(await response?.json()).toEqual('123')
  })

  it('should throw error - not found', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/pingp', {
        method: 'POST',
        headers: {
        },
        body: JSON.stringify({ value: '123' }),
      }),
    })

    expect(response?.status).toEqual(404)
    expect(await response?.json()).toEqual({ code: 'NOT_FOUND', message: 'Not found', status: 404 })
  })

  it('should throw error - not found - lazy', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/lazyRouter/not_found', {
        method: 'POST',
        headers: {
        },
        body: JSON.stringify({ value: '123' }),
      }),
    })

    expect(response?.status).toEqual(404)
    expect(await response?.json()).toEqual({ code: 'NOT_FOUND', message: 'Not found', status: 404 })
  })

  it('should throw error - invalid input', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: 123 }),
      }),
    })

    expect(response?.status).toEqual(400)
    expect(await response?.json()).toEqual({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Input validation failed',
      issues: [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: [
            'value',
          ],
          message: 'Expected string, received number',
        },
      ],
    })
  })

  it('should throw error - invalid input - lazy', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/lazyRouter/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: 123 }),
      }),
    })

    expect(response?.status).toEqual(400)
    expect(await response?.json()).toEqual({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Input validation failed',
      issues: [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: [
            'value',
          ],
          message: 'Expected string, received number',
        },
      ],
    })
  })

  it('should throw error - invalid input - lazy - lazy', async () => {
    const response = await handler({
      router,
      request: new Request('http://localhost/lazyRouter/lazyRouter/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: 123 }),
      }),
    })

    expect(response?.status).toEqual(400)
    expect(await response?.json()).toEqual({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Input validation failed',
      issues: [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: [
            'value',
          ],
          message: 'Expected string, received number',
        },
      ],
    })
  })

  it('abort signal', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    const func = vi.fn()
    const onSuccess = vi.fn()

    const ping = os.func(func)

    const response = await handler({
      router: { ping },
      request: new Request('http://localhost/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ }),
      }),
      signal,
      onSuccess,
    })

    expect(response?.status).toEqual(200)

    expect(func).toBeCalledTimes(1)
    expect(func.mock.calls[0]![2].signal).toBe(signal)
    expect(onSuccess).toBeCalledTimes(1)
    expect(func.mock.calls[0]![2].signal).toBe(signal)
  })
})
