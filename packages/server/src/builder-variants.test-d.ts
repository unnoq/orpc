import type { ContractProcedure, ErrorMap, MergedErrorMap, Meta, ORPCErrorConstructorMap, Schema } from '@orpc/contract'
import type { OmitChainMethodDeep } from '@orpc/shared'
import type { Builder } from './builder'
import type { BuilderWithMiddlewares, ProcedureBuilder, ProcedureBuilderWithInput, ProcedureBuilderWithInputOutput, ProcedureBuilderWithOutput, RouterBuilder } from './builder-variants'
import type { Context } from './context'
import type { Lazy } from './lazy'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter } from './router'
import { type baseErrorMap, type BaseMeta, generalSchema, type inputSchema, type outputSchema } from '../../contract/tests/shared'
import { type CurrentContext, type InitialContext, router } from '../tests/shared'

const generalBuilder = {} as Builder<
  InitialContext,
  CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
>

describe('BuilderWithMiddlewares', () => {
  const builder = {} as BuilderWithMiddlewares<
    InitialContext,
    CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
            typeof generalBuilder,
            '$config' | '$context' | '$meta' | '$route' | 'middleware'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'invalid' }, OVERRIDE: { message: 'override' } })).toEqualTypeOf<
      BuilderWithMiddlewares<
        InitialContext,
        CurrentContext,
                typeof inputSchema,
                typeof outputSchema,
                MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string }, OVERRIDE: { message: string } }>,
                BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  describe('.use', () => {
    it('without map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        BuilderWithMiddlewares<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with error map', () => {
      const errors = {
        OVERRIDE: { message: 'OVERRIDE' },
        ADDITIONAL: { message: 'ADDITIONAL' },
      }
      const mid = {} as Middleware<Context, { extra: boolean }, unknown, any, typeof errors, Meta>
      const applied = builder.use(mid)

      expectTypeOf(applied).toEqualTypeOf<
        BuilderWithMiddlewares<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof errors, typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      BuilderWithMiddlewares<
        InitialContext,
        CurrentContext,
                typeof inputSchema,
                typeof outputSchema,
                typeof baseErrorMap,
                BaseMeta
      >
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(generalSchema)).toEqualTypeOf<
      ProcedureBuilderWithInput<
        InitialContext,
        CurrentContext,
                typeof generalSchema,
                typeof outputSchema,
                typeof baseErrorMap,
                BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.input({})
  })

  it('.output', () => {
    expectTypeOf(builder.output(generalSchema)).toEqualTypeOf<
      ProcedureBuilderWithOutput<
        InitialContext,
        CurrentContext,
                typeof inputSchema,
                typeof generalSchema,
                typeof baseErrorMap,
                BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.output({})
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<{ input: string }>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { output: 456 }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<
        InitialContext,
        CurrentContext,
                typeof inputSchema,
                typeof outputSchema,
                { output: number },
                typeof baseErrorMap,
                BaseMeta
      >
    >()
  })
})

describe('ProcedureBuilder', () => {
  const builder = {} as ProcedureBuilder<
    InitialContext,
    CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
        typeof generalBuilder,
        '$config' | '$context' | '$meta' | '$route' | 'middleware' | 'prefix' | 'tag' | 'router' | 'lazy'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'invalid' }, OVERRIDE: { message: 'override' } })).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string }, OVERRIDE: { message: string } }>,
          BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  describe('.use', () => {
    it('without error map', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilder<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with error map', () => {
      const errors = {
        OVERRIDE: { message: 'OVERRIDE' },
        ADDITIONAL: { message: 'ADDITIONAL' },
      }
      const mid = {} as Middleware<Context, { extra: boolean }, unknown, any, typeof errors, Meta>
      const applied = builder.use(mid)

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilder<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof errors, typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ProcedureBuilder<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(generalSchema)).toEqualTypeOf<
      ProcedureBuilderWithInput<
        InitialContext,
        CurrentContext,
          typeof generalSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.input({})
  })

  it('.output', () => {
    expectTypeOf(builder.output(generalSchema)).toEqualTypeOf<
      ProcedureBuilderWithOutput<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof generalSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.output({})
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<{ input: string }>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { output: 456 }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        { output: number },
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})

describe('ProcedureBuilderWithInput', () => {
  const builder = {} as ProcedureBuilderWithInput<
    InitialContext,
    CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
      typeof generalBuilder,
      '$config' | '$context' | '$meta' | '$route' | 'middleware' | 'prefix' | 'tag' | 'router' | 'lazy' | 'input'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'invalid' }, OVERRIDE: { message: 'override' } })).toEqualTypeOf<
      ProcedureBuilderWithInput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  describe('.use', () => {
    it('without map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithInput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => {
        expectTypeOf(input).toEqualTypeOf<{ mapped: boolean }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      }, (input) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()

        return { mapped: true }
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithInput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      builder.use(
        ({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => next(),
        // @ts-expect-error --- invalid map input
        input => ({ invalid: true }),
      )

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }), input => ({ mapped: true }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }), input => ({ mapped: true }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}), input => ({ mapped: true }))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}), input => ({ mapped: true }))
    })

    it('with error map', () => {
      const errors = {
        OVERRIDE: { message: 'OVERRIDE' },
        ADDITIONAL: { message: 'ADDITIONAL' },
      }
      const mid = {} as Middleware<Context, { extra: boolean }, unknown, any, typeof errors, Meta>
      const applied = builder.use(mid)

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithInput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof errors, typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ProcedureBuilderWithInput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ProcedureBuilderWithInput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.output', () => {
    expectTypeOf(builder.output(generalSchema)).toEqualTypeOf<
      ProcedureBuilderWithInputOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof generalSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.output({})
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<{ input: string }>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { output: 456 }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        { output: number },
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})

describe('ProcedureBuilderWithOutput', () => {
  const builder = {} as ProcedureBuilderWithOutput<
    InitialContext,
    CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
      typeof generalBuilder,
      '$config' | '$context' | '$meta' | '$route' | 'middleware' | 'prefix' | 'tag' | 'router' | 'lazy' | 'output'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'invalid' }, OVERRIDE: { message: 'override' } })).toEqualTypeOf<
      ProcedureBuilderWithOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  describe('.use', () => {
    it('without error map', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithOutput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with error map', () => {
      const errors = {
        OVERRIDE: { message: 'OVERRIDE' },
        ADDITIONAL: { message: 'ADDITIONAL' },
      }
      const mid = {} as Middleware<Context, { extra: boolean }, unknown, any, typeof errors, Meta>
      const applied = builder.use(mid)

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithOutput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof errors, typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ProcedureBuilderWithOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ProcedureBuilderWithOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(generalSchema)).toEqualTypeOf<
      ProcedureBuilderWithInputOutput<
        InitialContext,
        CurrentContext,
        typeof generalSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.input({})
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<{ input: string }>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { output: 456 }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        { output: number },
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})

describe('ProcedureBuilderWithInputOutput', () => {
  const builder = {} as ProcedureBuilderWithInputOutput<
    InitialContext,
    CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
      typeof generalBuilder,
      '$config' | '$context' | '$meta' | '$route' | 'middleware' | 'prefix' | 'tag' | 'router' | 'lazy' | 'input' | 'output'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()
  })

  it('.errors', () => {
    expectTypeOf(builder.errors({ INVALID: { message: 'invalid' }, OVERRIDE: { message: 'override' } })).toEqualTypeOf<
      ProcedureBuilderWithInputOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        MergedErrorMap<typeof baseErrorMap, { INVALID: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - schema is invalid
    builder.errors({ TOO_MANY_REQUESTS: { data: {} } })
  })

  describe('.use', () => {
    it('without map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithInputOutput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => {
        expectTypeOf(input).toEqualTypeOf<{ mapped: boolean }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      }, (input) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()

        return { mapped: true }
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithInputOutput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      builder.use(
        ({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => next(),
        // @ts-expect-error --- invalid map input
        input => ({ invalid: true }),
      )

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }), input => ({ mapped: true }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }), input => ({ mapped: true }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}), input => ({ mapped: true }))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}), input => ({ mapped: true }))
    })

    it('with error map', () => {
      const errors = {
        OVERRIDE: { message: 'OVERRIDE' },
        ADDITIONAL: { message: 'ADDITIONAL' },
      }
      const mid = {} as Middleware<Context, { extra: boolean }, unknown, any, typeof errors, Meta>
      const applied = builder.use(mid)

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureBuilderWithInputOutput<
          InitialContext,
          CurrentContext & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          MergedErrorMap<typeof errors, typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      ProcedureBuilderWithInputOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ meta: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ method: 'GET' })).toEqualTypeOf<
      ProcedureBuilderWithInputOutput<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<{ input: string }>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { output: 456 }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        { output: number },
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})

describe('RouterBuilder', () => {
  const builder = {} as RouterBuilder<
    InitialContext,
    CurrentContext,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
      typeof generalBuilder,
      '$config' | '$context' | '$meta' | '$route' | 'middleware' | 'meta' | 'route' | 'input' | 'output' | 'handler'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('.prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<
      RouterBuilder<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid prefix
    builder.prefix(123)
  })

  it('.tag', () => {
    expectTypeOf(builder.tag('test', 'test2')).toEqualTypeOf<
      RouterBuilder<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>
    >()
  })

  describe('.use', () => {
    it('without error map', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        RouterBuilder<
          InitialContext,
          CurrentContext & { extra: boolean },
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      builder.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(builder.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with error map', () => {
      const errors = {
        OVERRIDE: { message: 'OVERRIDE' },
        ADDITIONAL: { message: 'ADDITIONAL' },
      }
      const mid = {} as Middleware<Context, { extra: boolean }, unknown, any, typeof errors, Meta>
      const applied = builder.use(mid)

      expectTypeOf(applied).toEqualTypeOf<
        RouterBuilder<
          InitialContext,
          CurrentContext & { extra: boolean },
          MergedErrorMap<typeof errors, typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })

  it('.router', () => {
    expectTypeOf(builder.router(router)).toEqualTypeOf<
      AdaptedRouter<typeof router, InitialContext, typeof baseErrorMap>
    >()

    builder.router({
      // @ts-expect-error - initial context is not match
      ping: {} as Procedure<{ invalid: true }, Context, undefined, undefined, unknown, Record<never, never>, BaseMeta>,
    })

    builder.router({
      // @ts-expect-error - meta def is not match
      ping: {} as Procedure<
        Context,
        Context,
        undefined,
        undefined,
        unknown,
        Record<never, never>,
        { invalid: true }
      >,
    })
  })

  it('.lazy', () => {
    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      AdaptedRouter<Lazy<typeof router>, InitialContext, typeof baseErrorMap>
    >()

    // @ts-expect-error - initial context is not match
    builder.lazy(() => Promise.resolve({
      default: {
        ping: {} as Procedure<{ invalid: true }, Context, undefined, undefined, unknown, Record<never, never>, BaseMeta>,
      },
    }))

    // @ts-expect-error - meta def is not match
    builder.lazy(() => Promise.resolve({
      default: {
        ping: {} as Procedure<
          Context,
          Context,
          undefined,
          undefined,
          unknown,
          Record<never, never>,
          { invalid: true }
        >,
      },
    }))
  })
})
