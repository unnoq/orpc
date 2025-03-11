import type { AnySchema, ErrorMap } from '@orpc/contract'
import type { baseErrorMap, BaseMeta } from '../../contract/tests/shared'
import type { CurrentContext } from '../tests/shared'
import type { Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { Procedure } from './procedure'

const decorated = {} as DecoratedMiddleware<
  CurrentContext,
  { extra: boolean },
  { input: string },
  { output: number },
  ORPCErrorConstructorMap<typeof baseErrorMap>,
  BaseMeta
>

describe('DecoratedMiddleware', () => {
  it('is a middleware', () => {
    expectTypeOf(decorated).toMatchTypeOf<
      Middleware<
        CurrentContext,
        { extra: boolean },
        { input: string },
        { output: number },
        ORPCErrorConstructorMap<typeof baseErrorMap>,
        BaseMeta
      >
    >()
  })

  it('.mapInput', () => {
    const mapped = decorated.mapInput((input: 'input') => ({ input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        CurrentContext,
        { extra: boolean },
        'input',
        { output: number },
        ORPCErrorConstructorMap<typeof baseErrorMap>,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid map input return
    decorated.mapInput((input: 'input') => ({ input: 123 }))
  })

  describe('.concat', () => {
    it('without map input', () => {
      const applied = decorated.concat(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext & { extra: boolean }>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | AbortSignal>()

        return next({
          context: {
            extra2: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext,
          MergedContext<{ extra: boolean }, { extra2: boolean }>,
          { input: string },
          { output: number },
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- conflict context
      decorated.concat(({ next }) => next({ context: { extra: 'invalid' } }))
      // @ts-expect-error --- output is not match
      decorated.concat(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with map input', () => {
      const applied = decorated.concat(({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => {
        expectTypeOf(input).toEqualTypeOf<{ mapped: boolean }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext & { extra: boolean }>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | AbortSignal>()

        return next({
          context: {
            extra2: true,
          },
        })
      }, (input) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()

        return { mapped: true }
      })

      expectTypeOf(applied).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext,
          MergedContext<{ extra: boolean }, { extra2: boolean }>,
          { input: string },
          { output: number },
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMeta
        >
      >()

      decorated.concat(
        ({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => next(),
        // @ts-expect-error --- invalid map input
        input => ({ invalid: true }),
      )

      // @ts-expect-error --- conflict context
      decorated.concat(({ next }) => next({ context: { extra: 'invalid' } }), input => ({ mapped: true }))
      // @ts-expect-error --- output is not match
      decorated.concat(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}), input => ({ mapped: true }))
    })
  })
})
