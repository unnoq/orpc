import type { ContractProcedure, ErrorMap, MergedErrorMap, Route, Schema } from '@orpc/contract'
import type { baseErrorMap, BaseMeta } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Builder } from './builder'
import type { BuilderWithMiddlewares } from './builder-variants'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Lazy } from './lazy'
import type { MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { Procedure } from './procedure'
import type { ProcedureBuilderWithoutInputMethods, ProcedureBuilderWithoutOutputMethods } from './procedure-builder-variants'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter } from './router'
import type { RouterBuilder } from './router-builder'
import { inputSchema, outputSchema } from '../../contract/tests/shared'
import { router } from '../tests/shared'

const builder = {} as Builder<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>

describe('Builder', () => {
  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
        undefined,
        undefined,
        Record<never, never>,
        BaseMeta
      >
    >()
  })

  it('.$config', () => {
    const applied = builder.$config({
      initialInputValidationIndex: Number.NEGATIVE_INFINITY,
      initialOutputValidationIndex: Number.POSITIVE_INFINITY,
    })

    expectTypeOf(applied).toEqualTypeOf<
      Builder<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>
    >()

    builder.$config({
      // @ts-expect-error - must be number
      initialInputValidationIndex: 'INVALID',
    })
  })

  it('.$context', () => {
    expectTypeOf(builder.$context()).toEqualTypeOf<
      Builder<Context, Context, typeof baseErrorMap, BaseMeta>
    >()
    expectTypeOf(builder.$context<{ anything: string }>()).toEqualTypeOf<
      Builder<{ anything: string }, { anything: string }, typeof baseErrorMap, BaseMeta>
    >()
  })

  it('.$meta', () => {
    expectTypeOf(builder.$meta<{ auth?: boolean }>({})).toEqualTypeOf<
      Builder<InitialContext, CurrentContext, typeof baseErrorMap, { auth?: boolean }>
    >()

    // @ts-expect-error - initial meta is required
    builder.$meta<{ auth?: boolean }>()
    // @ts-expect-error - auth is missing in initial meta
    builder.$meta<{ auth: boolean }>({})
  })

  it('.$route', () => {
    expectTypeOf(builder.$route({ method: 'GET' })).toEqualTypeOf<
      Builder<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid method
    builder.$route({ method: 'INVALID' })
  })

  describe('.middleware', () => {
    it('works', () => {
      expectTypeOf(
        builder.middleware(({ context, next, path, procedure, errors, signal }, input, output) => {
          expectTypeOf(input).toEqualTypeOf<unknown>()
          expectTypeOf(context).toEqualTypeOf<InitialContext>()
          expectTypeOf(path).toEqualTypeOf<string[]>()
          expectTypeOf(procedure).toEqualTypeOf<
            Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
          >()
          expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<any>>()
          expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
          expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

          return next({
            context: {
              extra: true,
            },
          })
        }),
      ).toEqualTypeOf<
        DecoratedMiddleware<InitialContext, { extra: boolean }, unknown, any, ORPCErrorConstructorMap<any>, BaseMeta>
      >()

      // @ts-expect-error --- conflict context
      builder.middleware(({ next }) => next({ db: 123 }))
    })

    it('can type input and output', () => {
      expectTypeOf(
        builder.middleware(({ next }, input: 'input', output: MiddlewareOutputFn<'output'>) => next({})),
      ).toEqualTypeOf<
        DecoratedMiddleware<InitialContext, Record<never, never>, 'input', 'output', ORPCErrorConstructorMap<any>, BaseMeta>
      >()
    })
  })

  it('.errors', () => {
    expectTypeOf(
      builder.errors({
        BAD_GATEWAY: { message: 'BAD' },
        OVERRIDE: { message: 'OVERRIDE' },
      }),
    ).toEqualTypeOf<
      BuilderWithErrors<
        InitialContext,
        CurrentContext,
        MergedErrorMap<typeof baseErrorMap, { BAD_GATEWAY: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    builder.errors({ BAD_GATEWAY: { data: {} } })
  })

  it('.use', () => {
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
      BuilderWithMiddlewares<
        InitialContext,
        CurrentContext & { extra: boolean },
        typeof baseErrorMap,
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

  it('.meta', () => {
    expectTypeOf(builder.meta({ log: true })).toEqualTypeOf<
      BuilderWithMiddlewares<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid meta
    builder.meta({ log: 'INVALID' })
  })

  it('.route', () => {
    expectTypeOf(builder.route({ path: '/test', method: 'GET' })).toEqualTypeOf<
      BuilderWithMiddlewares<InitialContext, CurrentContext, typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid method
    builder.route({ method: 'INVALID' })
  })

  it('.input', () => {
    expectTypeOf(builder.input(inputSchema)).toEqualTypeOf<
      ProcedureBuilderWithoutInputMethods<InitialContext, CurrentContext, typeof inputSchema, typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid schema
    builder.input({})
  })

  it('.output', () => {
    expectTypeOf(builder.output(outputSchema)).toEqualTypeOf<
      ProcedureBuilderWithoutOutputMethods<InitialContext, InitialContext, typeof outputSchema, typeof baseErrorMap, BaseMeta>
    >()

    // @ts-expect-error - invalid schema
    builder.output({})
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return 456
    })

    expectTypeOf(procedure).toMatchTypeOf<
      DecoratedProcedure<InitialContext, CurrentContext, undefined, undefined, number, typeof baseErrorMap, BaseMeta>
    >()
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
      ping: {} as Procedure<Context, Context, undefined, undefined, unknown, Record<never, never>, Route, { invalid?: true }, { invalid: true }>,
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
      ping: {} as Procedure<
        Context,
        Context,
        undefined,
        undefined,
        unknown,
        Record<never, never>,
        { invalid: true }
      >,
    }))
  })
})
