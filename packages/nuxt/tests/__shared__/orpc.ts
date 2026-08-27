import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import z from 'zod'
import { createNuxtUtils } from '../../src/client'

const staticProcedure = os
  .errors({ STATIC_ERROR: { data: z.object({ static: z.string() }) } })
  .input(z.object({ input: z.number() }))
  .output(z.object({ output: z.string() }))
  .handler(vi.fn(({ input }) => ({ output: input.input.toString() })))

export const router = {
  static: staticProcedure,
  optional: os
    .input(z.object({ input: z.number() }).optional())
    .handler(({ input }) => ({ output: input?.input.toString() })),
  nested: {
    static: staticProcedure,
  },
}

export const handler = new RPCHandler(router)

// prefer createORPCClient over createRouterClient for more close realistic
export const client: RouterClient<typeof router, { cache?: boolean }> = createORPCClient(new RPCLink({
  origin: 'http://localhost',
  fetch: async (url, init) => {
    const { response } = await handler.handle(new Request(url, init))
    return response ?? new Response('Not Found', { status: 404 })
  },
}))

export const orpc = createNuxtUtils(client)
