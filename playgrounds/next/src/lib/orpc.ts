import type { router } from '@/routers'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterUtilsPlugin } from '@orpc/tanstack-query'
import { createRouterUtils } from '@orpc/tanstack-query'
import type { RetryLinkPluginContext } from '@orpc/client/plugins'
import { BatchLinkPlugin, RetryLinkPlugin } from '@orpc/client/plugins'

export interface ClientContext extends RetryLinkPluginContext {}

const link = new RPCLink({
  origin: typeof window !== 'undefined' ? undefined : 'http://localhost:3000',
  url: '/rpc',
  plugins: [
    new BatchLinkPlugin({
      groups: [{
        condition: () => true,
        context: {},
      }],
    }),
    new RetryLinkPlugin(),
  ],
  headers: async () => {
    if (typeof window !== 'undefined') {
      return {}
    }

    const { headers } = await import('next/headers')
    return await headers()
  },
})

export const client: RouterClient<typeof router, ClientContext> = createORPCClient(link)

/**
 * Streamed and live queries dehydrate as static snapshots during SSR, so the
 * client must always refetch on mount to open a new stream after hydration.
 *
 * @see {@link https://orpc.dev/docs/integrations/tanstack-query#streamed-and-live-queries | TanStack Query Integration - Streamed and Live Queries}
 */
const streamingSSRPlugin: RouterUtilsPlugin<typeof client> = {
  name: 'streaming-ssr',
  initProcedureOptions(_path, options) {
    return {
      ...options,
      streamedOptions: {
        ...options.streamedOptions,
        initialData: [],
        refetchOnMount: 'always',
      },
      liveOptions: {
        ...options.liveOptions,
        refetchOnMount: 'always',
      },
    }
  },
}

export const orpc = createRouterUtils(client, {
  plugins: [streamingSSRPlugin],
})
