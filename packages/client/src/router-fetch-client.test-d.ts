import type { ProcedureClient } from '@orpc/server'
import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { z } from 'zod'
import { createRouterFetchClient } from './router-fetch-client'

describe('router fetch client', () => {
  const pingContract = oc
    .input(z.object({ in: z.string() }).transform(i => i.in))
    .output(z.string().transform(out => ({ out })))

  const pongContract = oc.input(z.number())
  const contractRouter = oc.router({
    ping: pingContract,
    nested: {
      pong: pongContract,
    },
  })

  const ping = os.contract(pingContract).handler(name => `ping ${name}`)
  const pong = os.contract(pongContract).handler(num => `pong ${num}`)

  const router = os.contract(contractRouter).router({
    ping,
    nested: os.lazy(() => Promise.resolve({ default: {
      pong: os.lazy(() => Promise.resolve({ default: pong })),
    } })),
  })

  it('build correct types with contract router', () => {
    const client = createRouterFetchClient<typeof contractRouter>({
      baseURL: 'http://localhost:3000/orpc',
    })

    expectTypeOf(client.ping).toMatchTypeOf<ProcedureClient<{ in: string }, { out: string }>>()
    expectTypeOf(client.nested.pong).toMatchTypeOf<ProcedureClient<number, unknown>>()
  })

  it('build correct types with router', () => {
    const client = createRouterFetchClient<typeof router>({
      baseURL: 'http://localhost:3000/orpc',
    })

    expectTypeOf(client.ping).toMatchTypeOf<ProcedureClient<{ in: string }, { out: string }>>()
    expectTypeOf(client.nested.pong).toMatchTypeOf<ProcedureClient<number, string>>()
  })
})
