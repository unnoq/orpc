import type { ORPCError } from '@orpc/server'
import { os, safe } from '@orpc/server'
import { z } from 'zod'
import { baseErrorMap, inputSchema, outputSchema } from '../../contract/tests/shared'
import { useServerAction } from './action-hooks'

describe('useServerAction', () => {
  const action = os
    .input(inputSchema.optional())
    .errors(baseErrorMap)
    .output(outputSchema)
    .handler(async ({ input }) => {
      return { output: Number(input) }
    })
    .actionable()

  const state = useServerAction(action)

  it('infer correct input', () => {
    state.execute({ input: 123 })
    state.execute(undefined)
    state.execute()
    // @ts-expect-error --- input is invalid
    state.execute({ input: 'invalid' })

    expectTypeOf(state.input).toEqualTypeOf<undefined | { input: number }>()
  })

  it('require non-undefindable input ', () => {
    const action = os.input(z.string()).handler(() => 123).actionable()

    const state = useServerAction(action)

    state.execute('123')
    // @ts-expect-error --- missing input
    state.execute()
    // @ts-expect-error --- invalid input
    state.execute(123)

    if (!state.isIdle || state.status !== 'idle') {
      expectTypeOf(state.input).toEqualTypeOf<string>()
    }
  })

  it('interceptors', async () => {
    const state = useServerAction(action, {
      interceptors: [
        async ({ input, next }) => {
          expectTypeOf(input).toEqualTypeOf<{ input: number } | undefined>()

          const [error, data, isDefined] = await safe(next())

          if (error && isDefined) {
            expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>>()
          }

          if (!error) {
            expectTypeOf(data).toEqualTypeOf<{ output: string }>()

            return data
          }

          return next()
        },
      ],
    })

    state.execute({ input: 123 }, {
      interceptors: [
        async ({ input, next }) => {
          expectTypeOf(input).toEqualTypeOf<{ input: number } | undefined>()

          const [error, data, isDefined] = await safe(next())

          if (error && isDefined) {
            expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>>()
          }

          if (!error) {
            expectTypeOf(data).toEqualTypeOf<{ output: string }>()

            return data
          }

          return next()
        },
      ],
    })
  })

  it('output', async () => {
    const [error, data, isDefined] = await state.execute({ input: 123 })

    if (error && isDefined) {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>>()
    }

    if (!error) {
      expectTypeOf(data).toEqualTypeOf<{ output: string }>()
    }

    if (state.isIdle || state.isPending || state.isError) {
      expectTypeOf(state.data).toEqualTypeOf<undefined>()
    }

    if (state.status === 'idle' || state.status === 'pending' || state.status === 'error') {
      expectTypeOf(state.data).toEqualTypeOf<undefined>()
    }

    if (state.isSuccess) {
      expectTypeOf(state.data).toEqualTypeOf<{ output: string }>()
    }

    if (state.status === 'success') {
      expectTypeOf(state.data).toEqualTypeOf<{ output: string }>()
    }
  })
})
