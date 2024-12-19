import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { type AdaptedContractRouter, ContractRouterBuilder } from './router-builder'

const schema = z.object({
  value: z.string().transform(() => 1),
})

const ping = new ContractProcedure({ InputSchema: schema, OutputSchema: undefined, route: { path: '/procedure' } })
const pinged = DecoratedContractProcedure.decorate(ping)

const pong = new ContractProcedure({ InputSchema: undefined, OutputSchema: schema })
const ponged = DecoratedContractProcedure.decorate(pong)

const router = {
  ping,
  pinged,
  pong,
  ponged,
  nested: {
    ping,
    pinged,
    pong,
    ponged,
  },
}

describe('AdaptedContractRouter', () => {
  it('decorate all procedures', () => {
    type Adapted = AdaptedContractRouter<typeof router>

    expectTypeOf<Adapted>().toEqualTypeOf<{
      ping: typeof pinged
      pinged: typeof pinged
      pong: typeof ponged
      ponged: typeof ponged
      nested: {
        ping: typeof pinged
        pinged: typeof pinged
        pong: typeof ponged
        ponged: typeof ponged
      }
    }>()
  })

  it('throw error on invalid procedure', () => {
    const router = {
      a: 1,
    }

    // @ts-expect-error - invalid procedure
    type Adapted = AdaptedContractRouter<typeof router>
  })
})

describe('router', () => {
  const builder = new ContractRouterBuilder({})

  it('return adapted router', () => {
    const routed = builder.router(router)

    expectTypeOf(routed).toEqualTypeOf<AdaptedContractRouter<typeof router>>()

    expectTypeOf(builder.router(ping)).toEqualTypeOf<AdaptedContractRouter<typeof ping>>()
  })

  it('throw error on invalid router', () => {
    const router = {
      a: 1,
    }

    // @ts-expect-error - invalid router
    const routed = builder.router(router)
  })
})

describe('prefix', () => {
  const builder = new ContractRouterBuilder({})

  it('return ContractRouterBuilder', () => {
    const routed = builder.prefix('/api')
    expectTypeOf(routed).toEqualTypeOf<ContractRouterBuilder>()
  })

  it('require valid prefix', () => {
    builder.prefix('/api')

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
    // @ts-expect-error - invalid prefix
    builder.prefix('')
  })
})

describe('tag', () => {
  const builder = new ContractRouterBuilder({})

  it('return ContractRouterBuilder', () => {
    const routed = builder.tag('tag')
    expectTypeOf(routed).toEqualTypeOf<ContractRouterBuilder>()
  })

  it('require valid tag', () => {
    builder.tag('tag')

    // @ts-expect-error - invalid tag
    builder.tag(1)
    // @ts-expect-error - invalid tag
    builder.tag({})
  })
})
