import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { DurableEventIteratorLinkPlugin } from '@orpc/experimental-durable-event-iterator/client'
import type { RouterClient } from '@orpc/server'
import type { router } from '../../worker'

const link = new RPCLink({
  url: `${window.location.origin}`,
  plugins: [
    new DurableEventIteratorLinkPlugin({
      url: `${window.location.origin}/chat-room`,
    }),
  ],
})

export const client: RouterClient<typeof router> = createORPCClient(link)
