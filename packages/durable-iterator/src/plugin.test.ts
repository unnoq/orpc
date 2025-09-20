import { os } from '@orpc/server'
import { StandardRPCHandler } from '@orpc/server/standard'
import { getClientDurableIteratorToken } from './client'
import { DURABLE_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_ITERATOR_PLUGIN_HEADER_VALUE } from './consts'
import { DurableIterator } from './iterator'
import { DurableIteratorHandlerPlugin } from './plugin'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('durableIteratorHandlerPlugin', async () => {
  const interceptor = vi.fn(({ next }) => next())

  const durableIterator = await new DurableIterator('some-room', { signingKey: 'signing-key' })

  const handler = new StandardRPCHandler({
    durableIterator: os.handler(() => durableIterator),
    regularResponse: os.handler(() => 'regular response'),
  }, {
    plugins: [
      new DurableIteratorHandlerPlugin(),
    ],
    interceptors: [
      interceptor,
    ],
  })

  it('should add plugin header when output is a client durable event iterator', async () => {
    const { response } = await handler.handle({
      url: new URL('http://localhost/durableIterator'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(response!.status).toBe(200)
    expect(response!.headers[DURABLE_ITERATOR_PLUGIN_HEADER_KEY]).toBe(DURABLE_ITERATOR_PLUGIN_HEADER_VALUE)
    const token = getClientDurableIteratorToken(durableIterator)
    expect(token).toBeTypeOf('string')
    expect(response!.body).toEqual({ json: token })
  })

  it('should not add plugin header when output is not a durable event iterator', async () => {
    const { response } = await handler.handle({
      url: new URL('http://localhost/regularResponse'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(response!.status).toBe(200)
    expect(response!.headers[DURABLE_ITERATOR_PLUGIN_HEADER_KEY]).toBeUndefined()
    expect(response!.body).toEqual({ json: 'regular response' })
  })

  it('should do nothing if handler does not match', async () => {
    const { matched } = await handler.handle({
      url: new URL('http://localhost/not-found'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(matched).toBe(false)
  })

  it('should throw error if plugin context is corrupted', async () => {
    interceptor.mockImplementationOnce(({ next, ...options }) => next({ ...options, context: {} }))

    const { response } = await handler.handle({
      url: new URL('http://localhost/durableIterator'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(response?.status).toBe(500)
  })
})
