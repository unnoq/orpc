import type { FetchHandlerPlugin } from '@orpc/server/fetch'
import { os } from '@orpc/server'
import { openapi } from '../../meta'
import { OpenAPIHandler } from './openapi-handler'

describe('openapiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts context and prefix options in handle method', async () => {
    const contextHandler = new OpenAPIHandler({
      ping: os
        .$context<{ userId: string }>()
        .meta(openapi({ method: 'POST', path: '/ping/pong' }))
        .handler(({ context }) => context.userId),
    })

    const { matched, response } = await contextHandler.handle(
      new Request('https://example.com/api/v1/ping/pong', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: null }),
      }),
      {
        context: { userId: 'u_123' },
        prefix: '/api/v1',
      },
    )

    expect(matched).toBe(true)
    expect(response!.status).toBe(200)
    await expect(response!.text()).resolves.toContain('u_123')

    const misMatchPrefixResult = await contextHandler.handle(
      new Request('https://example.com/invalid/ping', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: null }),
      }),
      {
        context: { userId: 'u_123' },
        prefix: '/api/v1',
      },
    )

    expect(misMatchPrefixResult.matched).toBe(false)
    expect(misMatchPrefixResult.response).toBeUndefined()
  })

  it('support fetch handler plugin', async () => {
    const plugin: FetchHandlerPlugin<any> = {
      name: 'test',
      initFetchHandlerOptions(options) {
        return {
          ...options,
          fetchInterceptors: [
            async () => ({ matched: true, response: new Response('intercepted') }),
          ],
        }
      },
    }

    const handler = new OpenAPIHandler({}, { plugins: [plugin] })

    const { matched, response } = await handler.handle(new Request('https://example.com/test'))

    expect(matched).toBe(true)
    expect(response).toBeInstanceOf(Response)
    expect(response!.status).toBe(200)
    return expect(response!.text()).resolves.toBe('intercepted')
  })

  it('keeps path params when the request body is a binary stream', async () => {
    const handler = new OpenAPIHandler({
      upload: os
        .meta(openapi({ method: 'POST', path: '/items/{id}' }))
        .handler(({ input }) => ({
          id: (input as { id: string }).id,
          hasBody: Boolean((input as { body: unknown }).body),
        })),
    })

    const { matched, response } = await handler.handle(
      new Request('https://example.com/items/42', {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: new Blob(['raw-bytes'], { type: 'application/octet-stream' }),
      }),
    )

    expect(matched).toBe(true)
    expect(response!.status).toBe(200)
    await expect(response!.json()).resolves.toEqual({
      id: '42',
      hasBody: true,
    })
  })
})
