import type { Client, ClientRest, ORPCError, Route } from '@orpc/contract'
import type { baseErrorMap, baseMeta, BaseMetaDef, baseRoute, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { Procedure } from './procedure'
import { describe } from 'node:test'
import { z } from 'zod'
import { DecoratedProcedure } from './procedure-decorated'

const decorated = {} as DecoratedProcedure<
  { auth: boolean },
  { auth: boolean } & { db: string },
  typeof inputSchema,
  typeof outputSchema,
  { output: number },
  typeof baseErrorMap,
  typeof baseRoute,
  BaseMetaDef,
  typeof baseMeta
>

// like decorated but lost route when trying change contract
const decoratedLostContract = {} as DecoratedProcedure<
  { auth: boolean },
  { auth: boolean } & { db: string },
  typeof inputSchema,
  typeof outputSchema,
  { output: number },
  typeof baseErrorMap,
  Route,
  BaseMetaDef,
  BaseMetaDef
>

describe('DecoratedProcedure', () => {
  it('is a procedure', () => {
    expectTypeOf(decorated).toMatchTypeOf<Procedure<
      { auth: boolean },
      { auth: boolean } & { db: string },
      typeof inputSchema,
      typeof outputSchema,
      { output: number },
      typeof baseErrorMap,
      typeof baseRoute,
      BaseMetaDef,
      typeof baseMeta
    >>()
  })

  it('.decorate', () => {
    expectTypeOf(DecoratedProcedure.decorate(
      {} as Procedure<
        { auth: boolean },
        { auth: boolean } & { db: string },
        typeof inputSchema,
        typeof outputSchema,
        { output: number },
        typeof baseErrorMap,
        typeof baseRoute,
        BaseMetaDef,
        typeof baseMeta
      >,
    )).toMatchTypeOf(decorated)
  })

  it('.errors', () => {

  })
})

describe('self chainable', () => {
  it('prefix', () => {
    expectTypeOf(decorated.prefix('/test')).toEqualTypeOf<
      typeof decoratedLostContract
    >()

    // @ts-expect-error - invalid prefix
    decorated.prefix('')
    // @ts-expect-error - invalid prefix
    decorated.prefix(1)
  })

  it('route', () => {
    expectTypeOf(decorated.route({ path: '/test', method: 'GET' })).toEqualTypeOf<
      typeof decoratedLostContract
    >()
    expectTypeOf(decorated.route({
      path: '/test',
      method: 'GET',
      description: 'description',
      summary: 'summary',
      deprecated: true,
      tags: ['tag1', 'tag2'],
    })).toEqualTypeOf<
      typeof decoratedLostContract
    >()

    // @ts-expect-error - invalid method
    decorated.route({ method: 'PUTT' })
    // @ts-expect-error - invalid path
    decorated.route({ path: 1 })
    // @ts-expect-error - invalid tags
    decorated.route({ tags: [1] })
  })

  describe('errors', () => {
    const errors = {
      BAD_GATEWAY: {
        data: z.object({
          why: z.string(),
        }),
      },
    }

    it('merge errors', () => {
      const i = decorated.errors(errors)

      expectTypeOf(i).toEqualTypeOf<
        DecoratedProcedure<
          { auth: boolean },
          { auth: boolean } & { db: string },
          typeof baseSchema,
          typeof baseSchema,
          { val: string },
          typeof baseErrors & typeof errors,
          typeof route
        >
      >()
    })

    it('prevent redefine old errorMap', () => {
      // @ts-expect-error - not allow redefine errorMap
      decorated.errors({ CODE: baseErrors.CODE })
      // @ts-expect-error - not allow redefine errorMap --- even with undefined
      decorated.errors({ CODE: undefined })
    })
  })

  it('use middleware', () => {
    const i = decorated
      .use(({ context, path, next, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ val: number }>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string }>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ val: string }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

        return next({
          context: {
            dev: true,
          },
        })
      })
      .use(({ context, path, next, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ val: number }>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { db: string } & { dev: boolean }>()
        expectTypeOf(path).toEqualTypeOf<string[]>()
        expectTypeOf(procedure).toEqualTypeOf<ANY_PROCEDURE>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ val: string }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrors>>()

        return next({})
      })

    expectTypeOf(i).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { auth: boolean } & { db: string } & { dev: boolean } & Record<never, never>,
        typeof baseSchema,
        typeof baseSchema,
        { val: string },
        typeof baseErrors,
        typeof route
      >
    >()
  })

  it('use middleware with map input', () => {
    const mid = {} as Middleware<Context, { extra: boolean }, number, any, Record<never, never>>

    const i = decorated.use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ val: number }>()
      return input.val
    })

    expectTypeOf(i).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { auth: boolean } & { db: string } & { extra: boolean },
        typeof baseSchema,
        typeof baseSchema,
        { val: string },
        typeof baseErrors,
        typeof route
      >
    >()

    // @ts-expect-error - invalid input
    decorated.use(mid)

    // @ts-expect-error - invalid mapped input
    decorated.use(mid, input => input)
  })

  it('prevent conflict on context', () => {
    decorated.use(({ context, path, next }, input) => next({}))
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1' } }))
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }))
    decorated.use(({ context, path, next }, input) => next({ context: { auth: true } }))

    decorated.use(({ context, path, next }, input) => next({}), () => 'anything')
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1' } }), () => 'anything')
    decorated.use(({ context, path, next }, input) => next({ context: { id: '1', extra: true } }), () => 'anything')
    decorated.use(({ context, path, next }, input) => next({ context: { auth: true } }), () => 'anything')

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1 } }))

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1, extra: true } }))

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1 } }), () => 'anything')

    // @ts-expect-error - conflict with context
    decorated.use(({ context, path, next }, input) => next({ context: { auth: 1, extra: true } }), () => 'anything')
  })

  it('handle middleware with output is typed', () => {
    const mid1 = {} as Middleware<Context, Record<never, never>, unknown, any, Record<never, never>>
    const mid2 = {} as Middleware<Context, Record<never, never>, unknown, { val: string }, Record<never, never>>
    const mid3 = {} as Middleware<Context, Record<never, never>, unknown, unknown, Record<never, never>>
    const mid4 = {} as Middleware<Context, Record<never, never>, unknown, { val: number }, Record<never, never>>

    decorated.use(mid1)
    decorated.use(mid2)

    // @ts-expect-error - required used any for output
    decorated.use(mid3)
    // @ts-expect-error - output is not match
    decorated.use(mid4)
  })

  it('unshiftTag', () => {
    expectTypeOf(decorated.unshiftTag('test')).toEqualTypeOf<
      DecoratedProcedure<{ auth: boolean }, { auth: boolean } & { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors, Route>
    >()
    expectTypeOf(decorated.unshiftTag('test', 'test2', 'test3')).toEqualTypeOf<
      DecoratedProcedure<{ auth: boolean }, { auth: boolean } & { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors, Route>
    >()

    // @ts-expect-error - invalid tag
    decorated.unshiftTag(1)
    // @ts-expect-error - invalid tag
    decorated.unshiftTag('123', 2)
  })

  it('unshiftMiddleware', () => {
    const mid1 = {} as Middleware<Context, Record<never, never>, unknown, any, Record<never, never>>
    const mid2 = {} as Middleware<{ auth: boolean }, Record<never, never>, unknown, any, Record<never, never>>
    const mid3 = {} as Middleware<{ auth: boolean }, { dev: boolean }, unknown, { val: number }, Record<never, never>>

    expectTypeOf(decorated.unshiftMiddleware(mid1)).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(mid1, mid2)).toEqualTypeOf<typeof decorated>()
    expectTypeOf(decorated.unshiftMiddleware(mid1, mid2, mid3)).toEqualTypeOf<typeof decorated>()

    const mid4 = {} as Middleware<{ auth: 'invalid' }, Record<never, never>, unknown, any, Record<never, never>>
    const mid5 = {} as Middleware<{ auth: boolean }, Record<never, never>, { val: number }, any, Record<never, never>>
    const mid7 = {} as Middleware<{ db: string }, Record<never, never>, unknown, { val: number }, Record<never, never>>
    const mid8 = {} as Middleware<Context, { auth: string }, unknown, { val: number }, Record<never, never>>

    // @ts-expect-error - context is not match
    decorated.unshiftMiddleware(mid4)
    // @ts-expect-error - input is not match
    decorated.unshiftMiddleware(mid5)
    // @ts-expect-error - context is not match
    decorated.unshiftMiddleware(mid7)
    // extra context is conflict with context
    expectTypeOf(decorated.unshiftMiddleware(mid8)).toEqualTypeOf<never>()
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(mid4, mid5, mid7, mid8)

    const mid9 = {} as Middleware<Context, { something_does_not_exists_yet: boolean }, unknown, any, Record<never, never>>
    const mid10 = {} as Middleware<Context, { something_does_not_exists_yet: string }, { val: number }, any, Record<never, never>>

    decorated.unshiftMiddleware(mid9)
    // @ts-expect-error - extra context of mid10 is conflict with extra context of mid9
    decorated.unshiftMiddleware(mid9, mid10)

    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(1)
    // @ts-expect-error - invalid middleware
    decorated.unshiftMiddleware(() => { }, 1)
  })

  it('callable', () => {
    const callable = decorated.callable({
      context: async (clientContext: 'something') => ({ auth: true }),
    })

    expectTypeOf(callable).toEqualTypeOf<
      & Procedure<{ auth: boolean }, { auth: boolean } & { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors, typeof route>
      & Client<'something', { val: string }, { val: number }, Error | ORPCError<'CODE', { why: string }>>
    >()
  })

  it('actionable', () => {
    const actionable = decorated.actionable({
      context: async (clientContext: 'something') => ({ auth: true }),
    })

    expectTypeOf(actionable).toEqualTypeOf<
      & Procedure<{ auth: boolean }, { auth: boolean } & { db: string }, typeof baseSchema, typeof baseSchema, { val: string }, typeof baseErrors, typeof route>
      & ((...rest: ClientRest<'something', { val: string }>) => Promise<{ val: number }>)
    >()
  })
})
