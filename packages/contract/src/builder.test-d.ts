import type { ReadonlyDeep } from '@orpc/shared'
import type { ContractBuilder, GetInitialRoute, MergeContractBuilderConfig } from './builder'
import type { StrictErrorMap } from './error-map'
import type { ContractProcedure } from './procedure'
import type { ContractProcedureBuilder } from './procedure-builder'
import type { ContractProcedureBuilderWithInput } from './procedure-builder-with-input'
import type { ContractProcedureBuilderWithOutput } from './procedure-builder-with-output'
import type { MergeRoute, StrictRoute } from './route'
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

type BaseErrorMap = StrictErrorMap<typeof baseErrorMap>

type Config = ReadonlyDeep<{ initialRoute: { description: 'from initial' } }>

const builder = {} as ContractBuilder<Config, BaseErrorMap>

describe('ContractBuilder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<ContractProcedure<undefined, undefined, BaseErrorMap, { description: string }>>()
  })

  it('.config', () => {
    expectTypeOf(builder.config({ initialRoute: { description: 'from config' } })).toEqualTypeOf<
      ContractBuilder<
        MergeContractBuilderConfig<Config, ReadonlyDeep<{ initialRoute: { description: 'from config' } }>>,
        BaseErrorMap
      >
    >()

    // @ts-expect-error - invalid method
    builder.config({ initialRoute: { method: 'HI' } })
  })

  it('.errors', () => {
    const errors = { BAD_GATEWAY: { data: schema } } as const

    expectTypeOf(builder.errors(errors))
      .toEqualTypeOf < ContractBuilder<Config, BaseErrorMap & StrictErrorMap<typeof errors>>>()

    // @ts-expect-error - not allow redefine error map
    builder.errors({ BASE: baseErrorMap.BASE })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ContractProcedureBuilder<
        BaseErrorMap,
        MergeRoute<StrictRoute<GetInitialRoute<Config>>, ReadonlyDeep<{ method: 'GET' }>>
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'HE' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(schema)).toEqualTypeOf<
      ContractProcedureBuilderWithInput<
      typeof schema,
        BaseErrorMap,
        StrictRoute<GetInitialRoute<Config>>
      >
    >()
  })

  it('.output', () => {
    expectTypeOf(builder.output(schema)).toEqualTypeOf<
      ContractProcedureBuilderWithOutput<typeof schema, BaseErrorMap, StrictRoute<GetInitialRoute<Config>>>
    >()
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/api')).toEqualTypeOf<ContractRouterBuilder<BaseErrorMap, '/api', undefined>>()

    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('tag1', 'tag2')).toEqualTypeOf<ContractRouterBuilder<BaseErrorMap, undefined, ['tag1', 'tag2']>>()

    // @ts-expect-error - invalid tag
    builder.tag(1)
  })

  it('.router', () => {
    const router = {
      ping: {} as ContractProcedure<undefined, typeof schema, BaseErrorMap, { description: string }>,
      pong: {} as ContractProcedure<typeof schema, undefined, Record<never, never>, Record<never, never>>,
    }

    expectTypeOf(builder.router(router)).toEqualTypeOf<AdaptedContractRouter<typeof router, BaseErrorMap, undefined, undefined>>()

    const invalidErrorMap = {
      BASE: {
        ...baseErrorMap.BASE,
        status: 400,
      },
    }

    builder.router({
      // @ts-expect-error - error map is not match
      ping: {} as ContractProcedure<undefined, typeof schema, typeof invalidErrorMap, Record<never, never>>,
    })
  })
})
