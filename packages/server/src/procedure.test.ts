import type { MiddlewareMeta } from '.'
import { ContractProcedure, DecoratedContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { os } from '.'
import {
  type DecoratedProcedure,
  decorateProcedure,
  isProcedure,
  Procedure,
} from './procedure'

it('isProcedure', () => {
  expect(
    isProcedure(
      decorateProcedure(
        new Procedure({
          contract: new ContractProcedure({
            InputSchema: undefined,
            OutputSchema: undefined,
          }),
          func: () => {},
        }),
      ),
    ),
  ).toBe(true)
  expect({
    zz$p: {
      contract: new DecoratedContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
      func: () => {},
    },
  }).toSatisfy(isProcedure)

  expect({
    zz$p: {
      contract: new DecoratedContractProcedure({
        InputSchema: undefined,
        OutputSchema: undefined,
      }),
    },
  }).not.toSatisfy(isProcedure)

  expect({
    zz$p: {
      handler: () => {},
    },
  }).not.toSatisfy(isProcedure)

  expect({}).not.toSatisfy(isProcedure)
  expect(12233).not.toSatisfy(isProcedure)
  expect('12233').not.toSatisfy(isProcedure)
  expect(undefined).not.toSatisfy(isProcedure)
  expect(null).not.toSatisfy(isProcedure)
})

describe('route method', () => {
  it('sets route options correctly', () => {
    const p = os.context<{ auth: boolean }>().func(() => {
      return 'test'
    })

    const p2 = p.route({ path: '/test', method: 'GET' })

    expect(p2.zz$p.contract.zz$cp.path).toBe('/test')
    expect(p2.zz$p.contract.zz$cp.method).toBe('GET')
  })

  it('preserves existing context and handler', () => {
    const handler = () => 'test'
    const p = os.context<{ auth: boolean }>().func(handler)

    const p2 = p.route({ path: '/test' })

    expect(p2.zz$p.func).toBe(handler)
    // Context type is preserved through the route method
    expectTypeOf(p2).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        undefined,
        undefined,
        undefined,
        string
      >
    >()
  })

  it('works with prefix method', () => {
    const p = os
      .context<{ auth: boolean }>()
      .route({ path: '/api', method: 'POST' })
      .func(() => 'test')

    const p2 = p.prefix('/v1')

    expect(p2.zz$p.contract.zz$cp.path).toBe('/v1/api')
    expect(p2.zz$p.contract.zz$cp.method).toBe('POST')
  })

  it('works with middleware', () => {
    const mid = os.middleware((_, __, meta) => meta.next({ context: { userId: '1' } }))

    const p = os
      .context<{ auth: boolean }>()
      .route({ path: '/test' })
      .use(mid)
      .func((input, context) => {
        expectTypeOf(context).toEqualTypeOf<
          { auth: boolean } & { userId: string }
        >()
        return 'test'
      })

    expect(p.zz$p.contract.zz$cp.path).toBe('/test')
    expect(p.zz$p.middlewares).toEqual([mid])
  })

  it('overrides existing route options', () => {
    const p = os
      .context<{ auth: boolean }>()
      .route({ path: '/test1', method: 'GET' })
      .func(() => 'test')

    const p2 = p.route({ path: '/test2', method: 'POST' })

    expect(p2.zz$p.contract.zz$cp.path).toBe('/test2')
    expect(p2.zz$p.contract.zz$cp.method).toBe('POST')
  })

  it('preserves input/output schemas', () => {
    const inputSchema = z.object({ id: z.number() })
    const outputSchema = z.string()
    const p = os
      .context<{ auth: boolean }>()
      .input(inputSchema)
      .output(outputSchema)
      .route({ path: '/test' })
      .func((input) => {
        expectTypeOf(input).toEqualTypeOf<{ id: number }>()
        return 'test'
      })

    const p2 = p.route({ path: '/test2' })

    // Type checking that schemas are preserved
    expectTypeOf(p2).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        undefined,
        typeof inputSchema,
        typeof outputSchema,
        string
      >
    >()
  })
})

it('prefix method', () => {
  const p = os.context<{ auth: boolean }>().func(() => {
    return 'unnoq'
  })

  const p2 = p.prefix('/test')

  expect(p2.zz$p.contract.zz$cp.path).toBe(undefined)

  const p3 = os
    .context<{ auth: boolean }>()
    .route({ path: '/test1' })
    .func(() => {
      return 'unnoq'
    })

  const p4 = p3.prefix('/test')
  expect(p4.zz$p.contract.zz$cp.path).toBe('/test/test1')
})

describe('use middleware', () => {
  it('infer types', () => {
    const p1 = os
      .context<{ auth: boolean }>()
      .use((_, __, meta) => {
        return meta.next({ context: { postId: 'string' } })
      })
      .func(() => {
        return 'unnoq'
      })

    const p2 = p1
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { auth: boolean } & { postId: string }
        >()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<string>>()

        return meta.next({
          context: {
            userId: '1',
          },
        })
      })
      .use((input, context, meta) => {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<
          { userId: string } & { postId: string } & { auth: boolean }
        >()
        expectTypeOf(meta).toEqualTypeOf<MiddlewareMeta<string>>()

        return meta.next({})
      })

    expectTypeOf(p2).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { postId: string } & { userId: string },
        undefined,
        undefined,
        string
      >
    >()
  })

  it('can map input', () => {
    const mid = os.middleware((input: { id: number }, __, meta) => {
      return meta.next({})
    })

    os.input(z.object({ postId: z.number() })).use(mid, (input) => {
      expectTypeOf(input).toEqualTypeOf<{ postId: number }>()

      return {
        id: input.postId,
      }
    })

    // @ts-expect-error mismatch input
    os.input(z.object({ postId: z.number() })).use(mid)

    // @ts-expect-error mismatch input
    os.input(z.object({ postId: z.number() })).use(mid, (input) => {
      return {
        wrong: input.postId,
      }
    })
  })

  it('add middlewares to beginning', () => {
    const mid1 = vi.fn()
    const mid2 = vi.fn()
    const mid3 = vi.fn()

    const p1 = os.use(mid1).func(() => 'unnoq')
    const p2 = p1.use(mid2).use(mid3)

    expect(p2.zz$p.middlewares).toEqual([mid3, mid2, mid1])
  })
})

describe('server action', () => {
  it('only accept undefined context', () => {
    expectTypeOf(os.func(() => {})).toMatchTypeOf<(...args: any[]) => any>()
    expectTypeOf(
      os.context<{ auth: boolean } | undefined>().func(() => {}),
    ).toMatchTypeOf<(...args: any[]) => any>()
    expectTypeOf(
      os.context<{ auth: boolean }>().func(() => {}),
    ).not.toMatchTypeOf<(...args: any[]) => any>()
  })

  it('infer types', () => {
    const p = os
      .input(z.object({ id: z.number() }))
      .output(z.string())
      .func(() => 'string')

    expectTypeOf(p).toMatchTypeOf<
      (input: { id: number }) => Promise<string>
    >()

    const p2 = os.input(z.object({ id: z.number() })).func(() => 12333)

    expectTypeOf(p2).toMatchTypeOf<
      (input: { id: number }) => Promise<number>
    >()
  })

  it('works with input', async () => {
    const p = os
      .input(z.object({ id: z.number(), date: z.date() }))
      .func(async (input, context) => {
        expect(context).toBe(undefined)
        return input
      })

    expect(await p({ id: 123, date: new Date('2022-01-01') })).toEqual({
      id: 123,
      date: new Date('2022-01-01'),
    })
  })
})
