import type { Lazy } from './lazy'
import type { DecoratedLazy } from './lazy-decorated'
import type { Middleware } from './middleware'
import type { Procedure } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, RouterBuilder } from './router-builder'
import type { WELL_CONTEXT } from './types'
import { z } from 'zod'
import { lazy } from './lazy'

const builder = {} as RouterBuilder<{ auth: boolean }, { db: string }>

describe('AdaptedRouter', () => {
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, undefined, undefined, unknown>
  const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown>

  it('without lazy', () => {
    const router = {
      ping,
      pong,
      nested: {
        ping,
        pong,
      },
    }
    const adapted = {} as AdaptedRouter<{ log: true, auth: boolean }, typeof router>

    expectTypeOf(adapted.ping).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, { db: string }, undefined, undefined, unknown>
    >()
    expectTypeOf(adapted.pong).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, undefined, undefined, undefined, unknown>
    >()
    expectTypeOf(adapted.nested.ping).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, { db: string }, undefined, undefined, unknown>
    >()
    expectTypeOf(adapted.nested.pong).toEqualTypeOf<
      DecoratedProcedure<{ log: true, auth: boolean }, undefined, undefined, undefined, unknown>
    >()
  })

  it('with lazy', () => {
    const router = {
      ping: lazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: lazy(() => Promise.resolve({
        default: {
          ping,
          pong: lazy(() => Promise.resolve({ default: pong })),
        },
      })),
    }

    const adapted = {} as AdaptedRouter<{ log: true } | undefined, typeof router>

    expectTypeOf(adapted.ping).toEqualTypeOf<DecoratedLazy<
      DecoratedProcedure<{ log: true } | undefined, { db: string }, undefined, undefined, unknown>
    >>()
    expectTypeOf(adapted.pong).toEqualTypeOf<
      DecoratedProcedure<{ log: true } | undefined, undefined, undefined, undefined, unknown>
    >()
    expectTypeOf(adapted.nested.ping).toEqualTypeOf<DecoratedLazy<
      DecoratedProcedure<{ log: true } | undefined, { db: string }, undefined, undefined, unknown>
    >>()
    expectTypeOf(adapted.nested.pong).toEqualTypeOf<DecoratedLazy<
      DecoratedProcedure<{ log: true } | undefined, undefined, undefined, undefined, unknown>
    >>()
  })

  it('with procedure', () => {
    expectTypeOf<AdaptedRouter<{ log: boolean }, typeof ping>>().toEqualTypeOf<
      DecoratedProcedure<{ log: boolean }, { db: string }, undefined, undefined, unknown>
    >()

    expectTypeOf < AdaptedRouter<{ log: boolean }, Lazy<typeof ping>>>().toEqualTypeOf<
      DecoratedLazy<DecoratedProcedure<{ log: boolean }, { db: string }, undefined, undefined, unknown>>
    >()
  })
})

describe('self chainable', () => {
  it('prefix', () => {
    expectTypeOf(builder.prefix('/test')).toEqualTypeOf<typeof builder>()

    // @ts-expect-error - invalid prefix
    builder.prefix('')
    // @ts-expect-error - invalid prefix
    builder.prefix(1)
  })

  it('tag', () => {
    expectTypeOf(builder.tag('test')).toEqualTypeOf<typeof builder>()
    expectTypeOf(builder.tag('test', 'test2', 'test3')).toEqualTypeOf<typeof builder>()

    // @ts-expect-error - invalid tag
    builder.tag(1)
    // @ts-expect-error - invalid tag
    builder.tag('123', 2)
  })

  it('use middleware', () => {
    const mid1 = {} as Middleware<{ auth: boolean }, undefined, unknown, unknown>
    const mid2 = {} as Middleware<{ auth: boolean }, { dev: string }, unknown, unknown>
    const mid3 = {} as Middleware<{ auth: boolean, db: string }, { dev: string }, unknown, unknown>

    expectTypeOf(builder.use(mid1)).toEqualTypeOf<typeof builder>()
    expectTypeOf(builder.use(mid2)).toEqualTypeOf<
      RouterBuilder<{ auth: boolean }, { db: string } & { dev: string }>
    >()
    expectTypeOf(builder.use(mid3)).toEqualTypeOf<
      RouterBuilder<{ auth: boolean }, { db: string } & { dev: string }>
    >()

    const mid4 = {} as Middleware<{ auth: boolean }, { dev: string }, unknown, { val: string }>
    const mid5 = {} as Middleware<{ auth: boolean }, { dev: string }, unknown, { val: number }>
    const mid6 = {} as Middleware<{ auth: 'invalid' }, undefined, any, unknown>

    // @ts-expect-error - invalid middleware
    builder.use(mid4)
    // @ts-expect-error - invalid middleware
    builder.use(mid5)
    // @ts-expect-error - invalid middleware
    builder.use(mid6)
    // @ts-expect-error - invalid middleware
    builder.use(true)
    // @ts-expect-error - invalid middleware
    builder.use(() => {})
  })
})

describe('to AdaptedRouter', () => {
  const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }>
  const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown>

  const wrongPing = {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown>

  it('router without lazy', () => {
    expectTypeOf(builder.router({ ping, pong, nested: { ping, pong } })).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        {
          ping: typeof ping
          pong: typeof pong
          nested: { ping: typeof ping, pong: typeof pong }
        }
      >
    >()

    builder.router({ ping })
    // @ts-expect-error - context is not match
    builder.router({ wrongPing })
  })

  it('router with lazy', () => {
    expectTypeOf(builder.router({
      ping: lazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: lazy(() => Promise.resolve({
        default: {
          ping,
          pong: lazy(() => Promise.resolve({ default: pong })),
        },
      })),
    })).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        {
          ping: Lazy<typeof ping>
          pong: typeof pong
          nested: Lazy<{ ping: typeof ping, pong: Lazy<typeof pong> }>
        }
      >
    >()

    builder.router({ ping: lazy(() => Promise.resolve({ default: ping })) })
    // @ts-expect-error - context is not match
    builder.router({ wrongPing: lazy(() => Promise.resolve({ default: wrongPing })) })
  })

  it('procedure as a router', () => {
    expectTypeOf(builder.router(ping)).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        typeof ping
      >
    >()

    expectTypeOf(builder.router(lazy(() => Promise.resolve({ default: ping })))).toEqualTypeOf<
      AdaptedRouter<
        { auth: boolean },
        Lazy<typeof ping>
      >
    >()
  })
})

describe('to Decorated Adapted Lazy', () => {
  const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, typeof schema, typeof schema, { val: string }>
  const pong = {} as Procedure<WELL_CONTEXT, undefined, undefined, undefined, unknown>

  const wrongPing = {} as Procedure<{ auth: 'invalid' }, undefined, undefined, undefined, unknown>

  it('router without lazy', () => {
    const router = {
      ping,
      pong,
      nested: {
        ping,
        pong,
      },
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      DecoratedLazy<AdaptedRouter<{ auth: boolean }, typeof router>>
    >()

    builder.lazy(() => Promise.resolve({ default: { ping } }))
    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: { wrongPing } }))
  })

  it('router with lazy', () => {
    const router = {
      ping: lazy(() => Promise.resolve({ default: ping })),
      pong,
      nested: lazy(() => Promise.resolve({
        default: {
          ping,
          pong: lazy(() => Promise.resolve({ default: pong })),
        },
      })),
    }

    expectTypeOf(builder.lazy(() => Promise.resolve({ default: router }))).toEqualTypeOf<
      DecoratedLazy<AdaptedRouter<{ auth: boolean }, typeof router>>
    >()

    builder.lazy(() => Promise.resolve({ default: { ping: lazy(() => Promise.resolve({ default: ping })) } }))
    // @ts-expect-error - context is not match
    builder.lazy(() => Promise.resolve({ default: { wrongPing: lazy(() => Promise.resolve({ default: wrongPing })) } }))
  })
})
