import type { ORPCError, ORPCErrorJSON } from '@orpc/client'
import type { baseErrorMap, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { ActionableClient, ActionableError, ProcedureActionableClient, UnactionableError } from './procedure-action'

it('ActionableError', () => {
  expectTypeOf<
    ActionableError<Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>>
  >().toEqualTypeOf<
    | ORPCErrorJSON<'CODE', { foo: string }> & { defined: true }
    | ORPCErrorJSON<'INTERNAL_SERVER_ERROR', { time: number }> & { defined: true }
    | ORPCErrorJSON<string, unknown> & { defined: false }
  >()
})

it('UnactionableError', () => {
  expectTypeOf<
    UnactionableError<
      | ORPCErrorJSON<'CODE', { foo: string }> & { defined: true }
      | ORPCErrorJSON<'INTERNAL_SERVER_ERROR', { time: number }> & { defined: true }
      | ORPCErrorJSON<string, unknown> & { defined: false }
    >
  >().toEqualTypeOf<
    Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>
  >()
})

describe('ActionableClient', () => {
  const action = {} as ActionableClient<{ input: string } | undefined, { output: number } | undefined, ActionableError<Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>>>

  it('input', async () => {
    await action({ input: 'input' })
    await action(undefined)
    await action()

    // @ts-expect-error - not allow second argument
    await action({ input: 'input' }, 'second' as any)
    // @ts-expect-error - invalid input
    await action('invalid')
  })

  it('require non-undefindable input', async () => {
    const action = {} as ActionableClient<{ input: string }, { output: number }, ActionableError<Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>>>

    await action({ input: 'input' })
    // @ts-expect-error - missing input
    await action()
    // @ts-expect-error - not allow second argument
    await action({ input: 'input' }, 'second' as any)
    // @ts-expect-error - invalid input
    await action('invalid')
  })

  it('result', async () => {
    const [error, data] = await action({ input: 'input' })

    if (!error) {
      expectTypeOf(data).toEqualTypeOf<{ output: number } | undefined>()
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
        expectTypeOf(error).toEqualTypeOf<ORPCErrorJSON<string, unknown> & { defined: false }>()
      }
    }
  })

  it('can reverse infer', async () => {
    expectTypeOf<
      typeof action extends ActionableClient<infer I, infer O, infer E> ? [I, O, E] : never
    >().toEqualTypeOf<[{ input: string } | undefined, { output: number } | undefined, ActionableError<Error | ORPCError<'CODE', { foo: string }> | ORPCError<'INTERNAL_SERVER_ERROR', { time: number }>>]>()
  })
})

it('ProcedureActionableClient', () => {
  expectTypeOf<
    ProcedureActionableClient<
     typeof inputSchema,
     typeof outputSchema,
     typeof baseErrorMap
    >
  >().toEqualTypeOf<
    ActionableClient<
      { input: number },
      { output: string },
      ORPCErrorJSON<'BASE', { output: string }> & { defined: true } | ORPCErrorJSON<'OVERRIDE', unknown> & { defined: true } | ORPCErrorJSON<string, unknown> & { defined: false }
    >
  >()
})
