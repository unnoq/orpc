import type { ErrorMap, Meta, ORPCErrorConstructorMap, Schema } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema, router } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Context, MergedContext } from './context'
import type { Implementer } from './implementer'
import type { ProcedureImplementer } from './implementer-procedure'
import type { ImplementerInternalWithMiddlewares } from './implementer-variants'
import type { Lazy } from './lazy'
import type { MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { Procedure } from './procedure'
import type { AdaptedRouter } from './router'
import { router as implRouter } from '../tests/shared'

describe('Implementer', () => {
  const implementer = {} as Implementer<typeof router, InitialContext, CurrentContext>

  describe('root level', () => {
    it('.$context', () => {
      const applied = implementer.$context<{ anything: string }>()

      expectTypeOf(applied).toMatchTypeOf<
        Implementer<typeof router, { anything: string }, { anything: string }>
      >()
    })

    it('.$config', () => {
      const applied = implementer.$config({
        initialInputValidationIndex: Number.NEGATIVE_INFINITY,
      })

      expectTypeOf(applied).toMatchTypeOf<
        Implementer<typeof router, InitialContext, CurrentContext>
      >()
    })
  })

  describe('router level', () => {
    describe('.middleware', () => {
      it('works', () => {
        const mid = implementer.nested.middleware(({ context, next, path, procedure, errors, signal }, input, output) => {
          expectTypeOf(input).toEqualTypeOf<unknown>()
          expectTypeOf(context).toEqualTypeOf<CurrentContext>()
          expectTypeOf(path).toEqualTypeOf<string[]>()
          expectTypeOf(procedure).toEqualTypeOf<
            Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta | Meta>
          >()
          expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<any>>()
          expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap | Record<never, never>>>()
          expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

          return next({
            context: {
              extra: true,
            },
          })
        })

        expectTypeOf(mid).toMatchTypeOf<
          DecoratedMiddleware<
            CurrentContext,
            { extra: boolean },
            unknown,
            any,
            typeof baseErrorMap | Record<never, never>,
            Meta | BaseMeta
          >
        >()

        // @ts-expect-error --- conflict context
        implementer.middleware(({ next }) => next({ db: 123 }))
      })

      it('can type input and output', () => {
        expectTypeOf(
          implementer.middleware(({ next }, input: 'input', output: MiddlewareOutputFn<'output'>) => next()),
        ).toEqualTypeOf<
          DecoratedMiddleware<
            CurrentContext,
            Record<never, never>,
            'input',
            'output',
            typeof baseErrorMap | Record<never, never>,
            Meta | BaseMeta
          >
        >()
      })
    })

    it('.use', () => {
      const applied = implementer.nested.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, BaseMeta | Meta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<unknown>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap | Record<never, never>>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toMatchTypeOf<
        ImplementerInternalWithMiddlewares<typeof router['nested'], InitialContext, MergedContext<CurrentContext, { extra: boolean }>>
      >()

      // @ts-expect-error --- conflict context
      implementer.use(({ next }) => next({ context: { db: 123 } }))
      // conflict but not detected
      expectTypeOf(implementer.use(({ next }) => next({ context: { db: undefined } }))).toMatchTypeOf<never>()
      // @ts-expect-error --- input is not match
      implementer.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      implementer.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('.router', () => {
      expectTypeOf(implementer.router(implRouter)).toEqualTypeOf<
        AdaptedRouter<typeof implRouter, InitialContext, Record<never, never>>
      >()

      implementer.router({
        // @ts-expect-error - initial context is not match
        ping: {} as Procedure<{ invalid: true }, Context, undefined, undefined, unknown, Record<never, never>, BaseMeta>,
      })

      implementer.router({
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

      // @ts-expect-error - missing implementation
      implementer.router({
        ping: implRouter.ping,
      })
    })

    it('.lazy', () => {
      expectTypeOf(implementer.lazy(() => Promise.resolve({ default: implRouter }))).toEqualTypeOf<
        AdaptedRouter<Lazy<typeof implRouter>, InitialContext, Record<never, never>>
      >()

      // @ts-expect-error - initial context is not match
      implementer.lazy(() => Promise.resolve({
        default: {
          ping: {} as Procedure<{ invalid: true }, Context, undefined, undefined, unknown, Record<never, never>, BaseMeta>,
        },
      }))

      // @ts-expect-error - meta def is not match
      implementer.lazy(() => Promise.resolve({
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

      // @ts-expect-error - missing implementation
      implementer.lazy(() => Promise.resolve({
        default: {
          ping: implRouter.ping,
        },
      }))
    })
  })

  it('each procedure is a ProcedureImplementer', () => {
    type ExpectedPing = ProcedureImplementer<
      InitialContext,
      CurrentContext,
      typeof inputSchema,
      typeof outputSchema,
      typeof baseErrorMap,
      BaseMeta
    >

    type ExpectedPong = ProcedureImplementer<
      InitialContext,
      CurrentContext,
      undefined,
      undefined,
      Record<never, never>,
      Meta
    >

    expectTypeOf(implementer.ping).toEqualTypeOf<ExpectedPing>()
    expectTypeOf(implementer.nested.ping).toEqualTypeOf<ExpectedPing>()
    expectTypeOf(implementer.pong).toEqualTypeOf<ExpectedPong>()
    expectTypeOf(implementer.nested.pong).toEqualTypeOf<ExpectedPong>()
  })
})
