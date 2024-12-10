import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { z } from 'zod'
import { createGeneralUtils } from './utils-general'
import { createProcedureUtils } from './utils-procedure'
import { createRouterUtils } from './utils-router'

const pingContract = oc.input(z.object({ name: z.string() })).output(z.string())
const pongContract = oc.input(z.number()).output(z.string())
const contractRouter = oc.router({
  ping: pingContract,
  pong: pongContract,
})

const ping = os.contract(pingContract).func(({ name }) => `ping ${name}`)
const pong = os.contract(pongContract).func(num => `pong ${num}`)

const router = os.contract(contractRouter).router({
  ping,
  pong: os.lazy(() => Promise.resolve({ default: pong })),
})

describe('with contract router', () => {
  it('build correct types', () => {
    const utils = createRouterUtils<typeof contractRouter>({} as any)

    const generalUtils = createGeneralUtils([])
    const pingUtils = createProcedureUtils(ping, [])
    const pingGeneralUtils = createGeneralUtils<{ name: string }>(['ping'])
    const pongUtils = createProcedureUtils(pong, [])
    const pongGeneralUtils = createGeneralUtils<number>(['ping'])

    expectTypeOf(utils).toMatchTypeOf<typeof generalUtils>()
    expectTypeOf(utils.ping).toMatchTypeOf<typeof pingUtils>()
    expectTypeOf(utils.ping).toMatchTypeOf<typeof pingGeneralUtils>()
    expectTypeOf(utils.pong).toMatchTypeOf<typeof pongUtils>()
    expectTypeOf(utils.pong).toMatchTypeOf<typeof pongGeneralUtils>()
  })
})

describe('with  router', () => {
  it('build correct types', () => {
    const utils = createRouterUtils<typeof router>({} as any)

    const generalUtils = createGeneralUtils([])
    const pingUtils = createProcedureUtils(ping, [])
    const pingGeneralUtils = createGeneralUtils<{ name: string }>(['ping'])
    const pongUtils = createProcedureUtils(pong, [])
    const pongGeneralUtils = createGeneralUtils<number>(['ping'])

    expectTypeOf(utils).toMatchTypeOf<typeof generalUtils>()
    expectTypeOf(utils.ping).toMatchTypeOf<typeof pingUtils>()
    expectTypeOf(utils.ping).toMatchTypeOf<typeof pingGeneralUtils>()
    expectTypeOf(utils.pong).toMatchTypeOf<typeof pongUtils>()
    expectTypeOf(utils.pong).toMatchTypeOf<typeof pongGeneralUtils>()
  })
})
