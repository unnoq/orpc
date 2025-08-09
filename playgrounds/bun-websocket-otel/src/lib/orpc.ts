import type { RouterClient } from '@orpc/server'
import type { router } from '../router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/websocket'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

declare global {
  var $client: RouterClient<typeof router> | undefined
}

const link = new RPCLink({
  websocket: new WebSocket(`${location.origin}/ws/rpc`),
})

export const client: RouterClient<typeof router> = globalThis.$client ?? createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
