import type { Procedure } from './procedure'
import type { Caller, Meta, WELL_CONTEXT } from './types'
import { z } from 'zod'
import { lazy } from './lazy'
import { createRouterCaller, type RouterCaller } from './router-caller'

const schema = z.object({ val: z.string().transform(val => Number(val)) })
const ping = {} as Procedure<WELL_CONTEXT, undefined, typeof schema, typeof schema, { val: string }>
const pong = {} as Procedure<{ auth: boolean }, undefined, undefined, undefined, unknown>

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

const routerWithLazy = {
  ping: lazy(() => Promise.resolve({ default: ping })),
  pong,
  nested: lazy(() => Promise.resolve({ default: {
    ping,
    pong: lazy(() => Promise.resolve({ default: pong })),
  } })),
}

describe('RouterCaller', () => {
  it('router without lazy', () => {
    const caller = {} as RouterCaller<typeof router>

    expectTypeOf(caller.ping).toEqualTypeOf<
      Caller<{ val: string }, { val: number }>
    >()
    expectTypeOf(caller.pong).toEqualTypeOf<
      Caller<unknown, unknown>
    >()

    expectTypeOf(caller.nested.ping).toEqualTypeOf<
      Caller<{ val: string }, { val: number }>
    >()
    expectTypeOf(caller.nested.pong).toEqualTypeOf<
      Caller<unknown, unknown>
    >()
  })

  it('support lazy', () => {
    expectTypeOf<RouterCaller<typeof routerWithLazy>>().toEqualTypeOf<RouterCaller<typeof router>>()
  })

  it('support procedure as router', () => {
    expectTypeOf<RouterCaller<typeof ping>>().toEqualTypeOf<Caller<{ val: string }, { val: number }>>()
  })
})

describe('createRouterCaller', () => {
  it('return RouterCaller', () => {
    const caller = createRouterCaller({
      router,
      context: { auth: true },
    })

    expectTypeOf(caller).toMatchTypeOf<RouterCaller<typeof router>>()

    const caller2 = createRouterCaller({
      router: routerWithLazy,
      context: { auth: true },
    })
    expectTypeOf(caller2).toMatchTypeOf<RouterCaller<typeof routerWithLazy>>()
  })

  it('required context when needed', () => {
    createRouterCaller({
      router: { ping },
    })

    createRouterCaller({
      router: { pong },
      context: { auth: true },
    })

    createRouterCaller({
      router: { pong },
      context: () => ({ auth: true }),
    })

    createRouterCaller({
      router: { pong },
      context: async () => ({ auth: true }),
    })

    createRouterCaller({
      router: { pong },
      // @ts-expect-error --- invalid context
      context: { auth: 'invalid' },
    })

    // @ts-expect-error --- missing context
    createRouterCaller({
      router: { pong },
    })
  })

  it('support hooks', () => {
    createRouterCaller({
      router,
      context: { auth: true },
      onSuccess: async ({ output }, context, meta) => {
        expectTypeOf(output).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<Record<string, unknown> & {
          auth: boolean
        }>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },
    })
  })

  it('support base path', () => {
    createRouterCaller({
      router: { ping },
      context: { auth: true },
      path: ['users'],
    })

    createRouterCaller({
      router: { ping },
      context: { auth: true },
      // @ts-expect-error --- invalid path
      path: [123],
    })
  })
})
