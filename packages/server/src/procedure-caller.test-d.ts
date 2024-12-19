import type { Procedure } from './procedure'
import type { Caller, Meta, WELL_CONTEXT } from './types'
import { z } from 'zod'
import { lazy } from './lazy'
import { createProcedureCaller } from './procedure-caller'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('createProcedureCaller', () => {
  const schema = z.object({ val: z.string().transform(v => Number(v)) })
  const procedure = {} as Procedure<WELL_CONTEXT, { val: string }, typeof schema, typeof schema, { val: string }>
  const procedureWithContext = {} as Procedure<{ userId?: string }, { db: string }, typeof schema, typeof schema, { val: string }>

  it('just a caller', () => {
    const caller = createProcedureCaller({
      procedure,
    })

    expectTypeOf(caller).toEqualTypeOf<Caller<{ val: string }, { val: number }>>()
  })

  it('context can be optional and can be a sync or async function', () => {
    createProcedureCaller({
      procedure,
    })

    createProcedureCaller({
      procedure,
      context: undefined,
    })

    // @ts-expect-error - missing context
    createProcedureCaller({
      procedure: procedureWithContext,
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      context: { userId: '123' },
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      // @ts-expect-error invalid context
      context: { userId: 123 },
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      context: () => ({ userId: '123' }),
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      // @ts-expect-error invalid context
      context: () => ({ userId: 123 }),
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      context: async () => ({ userId: '123' }),
    })

    createProcedureCaller({
      procedure: procedureWithContext,
      // @ts-expect-error invalid context
      context: async () => ({ userId: 123 }),
    })
  })

  it('accept hooks', () => {
    createProcedureCaller({
      procedure,

      async execute(input, context, meta) {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta & { next: () => Promise<{ val: number }> }>()

        return { val: 123 }
      },

      onStart(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'pending', input: unknown, output: undefined, error: undefined }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },

      onSuccess(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'success', input: unknown, output: { val: number }, error: undefined }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },

      onError(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'error', input: unknown, output: undefined, error: Error }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },

      onFinish(state, context, meta) {
        expectTypeOf(state).toEqualTypeOf<{ status: 'success', input: unknown, output: { val: number }, error: undefined } | { status: 'error', input: unknown, output: undefined, error: Error }>()
        expectTypeOf(context).toEqualTypeOf<WELL_CONTEXT>()
        expectTypeOf(meta).toEqualTypeOf<Meta>()
      },
    })
  })

  it('accept paths', () => {
    createProcedureCaller({
      procedure,
      path: ['users'],
    })

    createProcedureCaller({
      procedure,
      // @ts-expect-error - invalid path
      path: [123],
    })
  })
})

it('support lazy procedure', () => {
  const schema = z.object({ val: z.string().transform(v => Number(v)) })
  const procedure = {} as Procedure<{ userId?: string }, undefined, typeof schema, typeof schema, { val: string }>
  const lazied = lazy(() => Promise.resolve({ default: procedure }))

  const caller = createProcedureCaller({
    procedure: lazied,
    context: async () => ({ userId: 'string' }),
    path: ['users'],

    onSuccess(state, context, meta) {
      expectTypeOf(state).toEqualTypeOf<{ status: 'success', input: unknown, output: { val: number }, error: undefined }>()
      expectTypeOf(context).toEqualTypeOf<{ userId: string }>()
      expectTypeOf(meta).toEqualTypeOf<Meta>()
    },
  })

  expectTypeOf(caller).toEqualTypeOf<Caller<{ val: string }, { val: number }>>()
})
