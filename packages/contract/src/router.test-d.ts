import type { ContractRouter, InferContractRouterInputs, InferContractRouterOutputs } from './router'
import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

const schema = z.object({
  value: z.string().transform(() => 1),
})

 type SchemaIn = { value: string }
 type SchemaOut = { value: number }

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

describe('ContractRouter', () => {
  it('procedure also is a contract router', () => {
    const _: ContractRouter = ping
  })

  it('just an object and accepts both procedures and decorated procedures', () => {
    const _: ContractRouter = router
  })
})

describe('InferContractRouterInputs', () => {
  it('works', () => {
    type Inputs = InferContractRouterInputs<typeof router>

    expectTypeOf<Inputs['ping']>().toEqualTypeOf<SchemaIn>()
    expectTypeOf<Inputs['pinged']>().toEqualTypeOf<SchemaIn>()
    expectTypeOf<Inputs['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inputs['ponged']>().toEqualTypeOf<unknown>()

    expectTypeOf<Inputs['nested']['ping']>().toEqualTypeOf<SchemaIn>()
    expectTypeOf<Inputs['nested']['pinged']>().toEqualTypeOf<SchemaIn>()
    expectTypeOf<Inputs['nested']['pong']>().toEqualTypeOf<unknown>()
    expectTypeOf<Inputs['nested']['ponged']>().toEqualTypeOf<unknown>()
  })
})

describe('InferContractRouterOutputs', () => {
  it('works', () => {
    type Outputs = InferContractRouterOutputs<typeof router>

    expectTypeOf<Outputs['ping']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['pinged']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['pong']>().toEqualTypeOf<SchemaOut>()
    expectTypeOf<Outputs['ponged']>().toEqualTypeOf<SchemaOut>()

    expectTypeOf<Outputs['nested']['ping']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['nested']['pinged']>().toEqualTypeOf<unknown>()
    expectTypeOf<Outputs['nested']['pong']>().toEqualTypeOf<SchemaOut>()
    expectTypeOf<Outputs['nested']['ponged']>().toEqualTypeOf<SchemaOut>()
  })
})
