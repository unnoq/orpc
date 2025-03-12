import type { RouterClient } from '@orpc/server'
import type { router } from '~/server/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCVueQueryUtils } from '@orpc/vue-query'

const rpcLink = new RPCLink({
  url: new URL('/rpc', typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000'),
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const client: RouterClient<typeof router> = createORPCClient(rpcLink)

export const orpc = createORPCVueQueryUtils(client)
