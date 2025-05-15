import type { router } from '../../../main/router'
import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { experimental_RPCLink as RPCLink } from '@orpc/client/electron-ipc'
import { createORPCReactQueryUtils } from '@orpc/react-query'

const link = new RPCLink()

export const client: RouterClient<typeof router> = createORPCClient(link)

export const orpc = createORPCReactQueryUtils(client)
