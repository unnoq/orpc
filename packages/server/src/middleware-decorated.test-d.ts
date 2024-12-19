import type { Middleware, MiddlewareMeta } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { WELL_CONTEXT } from './types'
import { decorateMiddleware } from './middleware-decorated'

describe('decorateMiddleware', () => {
  const decorated = decorateMiddleware(
    (input: { name: string }, context: { user?: string }, meta) => meta.next({ context: { auth: true as const, user: 'string' } }),
  )

  it('assignable to middleware', () => {
    const decorated = decorateMiddleware((input: { input: 'input' }, context, meta) => meta.next({}))
    const mid: Middleware<WELL_CONTEXT, undefined, { input: 'input' }, unknown> = decorated

    const decorated2 = decorateMiddleware((input, context, meta: MiddlewareMeta<'output'>) => meta.next({ context: { extra: true } }))
    const mid2: Middleware<WELL_CONTEXT, { extra: boolean }, unknown, 'output'> = decorated2
  })

  it('can map input', () => {
    const mapped = decorated.mapInput((input: 'something') => ({ name: input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<{ user?: string }, { auth: true, user: string }, 'something', unknown>
    >()
  })

  it('can concat', () => {
    const mapped = decorated.concat(
      (input: { age: number }, context, meta) => meta.next({ context: { db: true } }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string } & { age: number },
        unknown
      >
    >()
  })

  it('can concat with map input', () => {
    const mapped = decorated.concat(
      (input: { age: number }, context, meta) => meta.next({ context: { db: true } }),
      (input: { year: number }) => ({ age: 123 }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string } & { year: number },
        unknown
      >
    >()

    decorated.concat(
      (input: { age: number }, context, meta) => meta.next({ context: { db: true } }),
      // @ts-expect-error - invalid return input
      (input: { year: number }) => ({ age: '123' }),
    )
  })

  it('can concat and prevent conflict on context', () => {
    const mapped = decorated.concat(
      (input, context, meta) => meta.next({ context: { db: true } }),
    )

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        { user?: string },
        { auth: true, user: string } & { db: boolean },
        { name: string },
        unknown
      >
    >()

    decorated.concat(
      // @ts-expect-error - user is not assignable to existing user context
      (input, context, meta) => meta.next({ context: { user: true } }),
    )

    decorated.concat(
      // @ts-expect-error - user is not assignable to existing user context
      (input, context, meta) => meta.next({ context: { user: true } }),
      () => 'anything',
    )
  })
})
