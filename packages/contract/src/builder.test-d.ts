import type { ContractBuilder } from './builder'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { AdaptedContractRouter, ContractRouterBuilder } from './router-builder'
import { z } from 'zod'

const schema = z.object({ value: z.string() })

const baseErrorMap = {
  BASE: {
    data: z.object({
      message: z.string(),
    }),
  },
}

const builder = {} as ContractBuilder<{ initialRoute: { description: string } }, typeof baseErrorMap>

describe('ContractBuilder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<ContractProcedure<undefined, undefined, typeof baseErrorMap, { description: string }>>()
  })

  it('.config', () => {
    expectTypeOf(builder.config({ initialRoute: { description: 'from config' } })).toEqualTypeOf<typeof builder>()

    // @ts-expect-error - invalid method
    builder.config({ initialRoute: { method: 'HI' } })
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: schema } } as const

    expectTypeOf(builder.errors(errors))
      .toEqualTypeOf<ContractBuilder<typeof baseErrorMap & typeof errors>>()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<ContractProcedureBuilder<typeof baseErrorMap>>()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ContractProcedureBuilderWithInput<typeof schema, typeof baseErrorMap >
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<typeof schema, typeof baseErrorMap >
    >()
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<ContractRouterBuilder<typeof baseErrorMap>>()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<ContractRouterBuilder<typeof baseErrorMap>>()

    // @ts-expect-error - invalid tag
    builder.tag(1)
  })

  it('.router', () => {
    const router = {
      ping: {} as ContractProcedure<undefined, typeof schema, typeof baseErrorMap>,
      pong: {} as ContractProcedure<typeof schema, undefined, Record<never, never>>,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<AdaptedContractRouter<typeof router, typeof baseErrorMap>>()

    const invalidErrorMap = {
      BASE: {
        ...baseErrorMap.BASE,
        status: 400,
      },
    }

    builder.router({
      // @ts-expect-error - error map is not match
      ping: {} as ContractProcedure<undefined, typeof schema, typeof invalidErrorMap>,
    })
  })
})
