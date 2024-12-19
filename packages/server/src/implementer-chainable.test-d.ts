import type { ChainableImplementer } from './implementer-chainable'
import type { Middleware } from './middleware'
import type { ProcedureImplementer } from './procedure-implementer'
import type { RouterImplementer } from './router-implementer'
import type { WELL_CONTEXT } from './types'
import { oc } from '@orpc/contract'
import { z } from 'zod'
import { createChainableImplementer } from './implementer-chainable'

const schema = z.object({ val: z.string().transform(val => Number(val)) })

const ping = oc.input(schema).output(schema)
const pong = oc.route({ method: 'GET', path: '/ping' })

const contract = oc.router({
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
})

describe('ChainableImplementer', () => {
  it('with procedure', () => {
    expectTypeOf(createChainableImplementer(ping)).toEqualTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, typeof schema, typeof schema>
    >()

    expectTypeOf(createChainableImplementer(pong)).toEqualTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, undefined, undefined>
    >()
  })

  it('with router', () => {
    const implementer = createChainableImplementer(contract)

    expectTypeOf(implementer).toMatchTypeOf<
      Omit<RouterImplementer<WELL_CONTEXT, undefined, typeof contract>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.ping).toEqualTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, typeof schema, typeof schema>
    >()

    expectTypeOf(implementer.pong).toEqualTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, undefined, undefined>
    >()

    expectTypeOf(implementer.nested).toMatchTypeOf<
      Omit<RouterImplementer<WELL_CONTEXT, undefined, typeof contract.nested>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.nested.ping).toEqualTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, typeof schema, typeof schema>
    >()

    expectTypeOf(implementer.nested.pong).toEqualTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, undefined, undefined>
    >()
  })

  it('not expose properties of router implementer', () => {
    const implementer = createChainableImplementer(contract)

    expectTypeOf(implementer).not.toHaveProperty('~orpc')
    expectTypeOf(implementer).not.toHaveProperty('~type')
    expectTypeOf(implementer.router).not.toHaveProperty('~orpc')
    expectTypeOf(implementer.router).not.toHaveProperty('~type')
  })

  it('works on conflicted', () => {
    const contract = oc.router({
      use: ping,
      router: {
        use: ping,
        router: pong,
      },
    })

    const implementer = createChainableImplementer(contract)

    expectTypeOf(implementer).toMatchTypeOf<
      Omit<RouterImplementer<WELL_CONTEXT, undefined, typeof contract>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.use).toMatchTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, typeof schema, typeof schema>
    >()

    expectTypeOf(implementer.router).toMatchTypeOf<
      Omit<RouterImplementer<WELL_CONTEXT, undefined, typeof contract.router>, '~type' | '~orpc'>
    >()

    expectTypeOf(implementer.router.use).toMatchTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, typeof schema, typeof schema>
    >()

    expectTypeOf(implementer.router.router).toMatchTypeOf<
      ProcedureImplementer<WELL_CONTEXT, undefined, undefined, undefined>
    >()
  })
})

describe('createChainableImplementer', () => {
  it('with procedure', () => {
    const implementer = createChainableImplementer(ping)
    expectTypeOf(implementer).toEqualTypeOf<ChainableImplementer<WELL_CONTEXT, undefined, typeof ping>>()
  })

  it('with router', () => {
    const implementer = createChainableImplementer(contract)
    expectTypeOf(implementer).toEqualTypeOf<ChainableImplementer<WELL_CONTEXT, undefined, typeof contract>>()
  })

  it('with middlewares', () => {
    const mid = {} as Middleware<{ auth: boolean }, { db: string }, unknown, unknown>
    const implementer = createChainableImplementer(contract, [mid])
    expectTypeOf(implementer).toEqualTypeOf<ChainableImplementer<{ auth: boolean }, { db: string }, typeof contract>>()
  })
})
