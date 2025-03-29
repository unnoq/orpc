import type { ORPCError, ORPCErrorJSON } from '@orpc/client'
import type { ActionableClient } from './procedure-action'

describe('ActionableClient', () => {
  const action = {} as ActionableClient<{ input: string }, { output: number }, Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>>

  it('input', async () => {
    await action({ input: 'input' })
    // @ts-expect-error - not allow second argument
    await action({ input: 'input' }, 'second' as any)
    // @ts-expect-error - invalid input
    await action('invalid')
  })

  it('optional undefinedable input', async () => {
    const action = {} as ActionableClient<{ input: string } | undefined, { output: number }, Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>>

    await action({ input: 'input' })
    await action(undefined)
    await action()

    // @ts-expect-error - not allow second argument
    await action({ input: 'input' }, 'second' as any)
    // @ts-expect-error - invalid input
    await action('invalid')
  })

  it('result', async () => {
    const [error, data] = await action({ input: 'input' })

    if (!error) {
      expectTypeOf(data).toEqualTypeOf<{ output: number }>()
    }

    if (error) {
      if (error.defined) {
        if (error.code === 'CODE') {
          expectTypeOf(error).toEqualTypeOf<ORPCErrorJSON<'CODE', { foo: string }> & { defined: true }>()
        }

        if (error.code === 'INTERNAL_SERVER_ERROR') {
          expectTypeOf(error).toEqualTypeOf<ORPCErrorJSON<'INTERNAL_SERVER_ERROR', { time: number }> & { defined: true }>()
        }
      }
      else {
        expectTypeOf(error).toEqualTypeOf<ORPCError<string, unknown> & { defined: false }>()
      }
    }
  })
})
