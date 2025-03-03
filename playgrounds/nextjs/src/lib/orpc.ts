import type { router } from '@/router'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const rpcLink = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const orpcClient: RouterClient<typeof router> = createORPCClient(rpcLink)

export const orpc = createORPCReactQueryUtils(orpcClient)
