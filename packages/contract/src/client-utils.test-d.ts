import type { Client } from './client'
import { safe } from './client-utils'
import { isDefinedError, type ORPCError } from './error-orpc'

it('safe', async () => {
  const client = {} as Client<unknown, string, number, Error | ORPCError<'BAD_GATEWAY', { val: string }>>

  const [output, error, isDefined] = await safe(client('123'))

  if (!error) {
    expectTypeOf(output).toEqualTypeOf<number>()
  }

  if (isDefined) {
    expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
  }

  if (error) {
    expectTypeOf(error).toEqualTypeOf<Error | ORPCError<'BAD_GATEWAY', { val: string }>>()

    if (isDefinedError(error)) {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'BAD_GATEWAY', { val: string }>>()
    }
  }
})
