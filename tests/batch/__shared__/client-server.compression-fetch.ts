import type { CreateBatchClientServerTest } from './client-server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { BatchLinkPlugin, ResponseCompressionLinkPlugin } from '@orpc/client/plugins'
import { BatchResponseCompressionHandlerPlugin } from '@orpc/node'
import { RPCHandler } from '@orpc/server/fetch'
import { BatchHandlerPlugin } from '@orpc/server/plugins'
import { defaultBatchClientServerOptions, defaultBatchGroup } from './client-server'

/**
 * The fetch adapter, driven without a socket so that no fetch implementation decompresses the
 * response on the way in. Decompression is left to the client plugin, which covers the half of the
 * contract the node-http variant cannot reach, where `fetch` decodes the body before the link sees it.
 */
export const createCompressionFetchBatchClientServerTest: CreateBatchClientServerTest = (
  router,
  {
    context = defaultBatchClientServerOptions.context,
    method = 'POST',
    mode = defaultBatchClientServerOptions.mode,
    serializer = defaultBatchClientServerOptions.serializer,
  } = {},
) => {
  const handler = new RPCHandler(router, {
    serializer,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'QUERY'],
    plugins: [
      new BatchHandlerPlugin(),
      // always compress for testing
      new BatchResponseCompressionHandlerPlugin({ threshold: 0 }),
    ],
  })

  const fetchSpy = vi.fn(async (url: string, init: RequestInit) => {
    const { response } = await handler.handle(new Request(url, init), { context, prefix: '/rpc' })
    const resolved = response ?? new Response('Not Found', { status: 404 })

    if (resolved.status === 207) { // every batch response, framed or json, travels compressed here
      expect(resolved.headers.get('content-encoding')).toBe('gzip')
    }

    return resolved
  })

  const link = new RPCLink({
    url: '/rpc',
    origin: 'http://localhost',
    method,
    serializer,
    fetch: fetchSpy,
    plugins: [
      new BatchLinkPlugin({ groups: [defaultBatchGroup], mode }),
      new ResponseCompressionLinkPlugin(),
    ],
  })

  return {
    client: createORPCClient(link),
    fetchSpy,
  }
}
