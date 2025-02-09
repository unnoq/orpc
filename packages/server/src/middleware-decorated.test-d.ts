import type { MergedErrorMap } from '@orpc/contract'
import type { baseErrorMap, BaseMeta } from '../../contract/tests/shared'
import type { CurrentContext } from '../tests/shared'
import type { Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'

const decorated = {} as DecoratedMiddleware<
  CurrentContext,
  { extra: boolean },
  { input: string },
  { output: number },
  typeof baseErrorMap,
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
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })

  it('.errors', () => {
    const applied = decorated.errors({
      BAD_GATEWAY: { message: 'BAD_GATEWAY' },
      OVERRIDE: { message: 'OVERRIDE' },
    })

    expectTypeOf(applied).toEqualTypeOf<
      DecoratedMiddleware<
        CurrentContext,
        { extra: boolean },
        { input: string },
        { output: number },
        MergedErrorMap<typeof baseErrorMap, { BAD_GATEWAY: { message: string }, OVERRIDE: { message: string } }>,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid schema
    decorated.errors({ BAD_GATEWAY: { data: {} } })
  })

  it('.mapInput', () => {
    const mapped = decorated.mapInput((input: 'input') => ({ input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        CurrentContext,
        { extra: boolean },
        'input',
        { output: number },
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })

  describe('.concat', () => {
    it('without map input', () => {
      const mapped = decorated.concat(
        ({ next }, input: { input2: string }) => next({ context: { extra2: true } }),
      )

      expectTypeOf(mapped).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext,
          { extra: boolean } & { extra2: boolean },
          { input: string } & { input2: string },
          { output: number },
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      decorated.concat(
        // @ts-expect-error - conflict context
        ({ next }) => next({ context: { extra: 'invalid' } }),
      )
    })

    it('with map input', () => {
      const mapped = decorated.concat(
        ({ next }, input) => {
          expectTypeOf(input).toEqualTypeOf<{ input: { input2: string } }>()
          return next({ context: { extra2: true } })
        },
        (input: { input2: string }) => ({ input }),
      )

      expectTypeOf(mapped).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext,
          { extra: boolean } & { extra2: boolean },
          { input: string } & { input2: string },
          { output: number },
          MergedErrorMap<typeof baseErrorMap, typeof baseErrorMap>,
          BaseMeta
        >
      >()

      decorated.concat(
        // @ts-expect-error - conflict context
        ({ next }) => next({ context: { extra: 'invalid' } }),
        input => ({ mapped: input }),
      )
    })
  })
})
