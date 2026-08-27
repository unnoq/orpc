import type { ComputedRef } from 'vue'
import { client, orpc } from './__shared__/orpc'

it('.call', () => {
  expectTypeOf(orpc.static.call).toEqualTypeOf(client.static)
})

it('.key', () => {
  expectTypeOf(orpc.static.key({ input: { input: 123 } })).toEqualTypeOf<string>()

  orpc.optional.key()

  // @ts-expect-error - `input` is required
  orpc.static.key()
  // @ts-expect-error - invalid input
  orpc.static.key({ input: { input: 'invalid' } })
})

it('.asyncDataArgs', async () => {
  const [key, fetch] = orpc.static.asyncDataArgs({ input: { input: 123 } })

  expectTypeOf(key).toEqualTypeOf<ComputedRef<string>>()
  expectTypeOf(await fetch()).toEqualTypeOf<{ output: string }>()

  orpc.optional.asyncDataArgs()
  orpc.static.asyncDataArgs({ input: () => ({ input: 123 }), context: { cache: true } })

  // @ts-expect-error - `input` is required
  orpc.static.asyncDataArgs()
  // @ts-expect-error - invalid input
  orpc.static.asyncDataArgs({ input: { input: 'invalid' } })
  // @ts-expect-error - invalid context
  orpc.static.asyncDataArgs({ input: { input: 123 }, context: { cache: 'invalid' } })
})

it('.matcher', () => {
  orpc.matcher()
  orpc.nested.matcher({ input: {} })
  orpc.static.matcher({ input: { input: 123 } })
  orpc.static.matcher({ strategy: 'exact', input: { input: 123 } })

  // @ts-expect-error - missing input field
  orpc.static.matcher({ strategy: 'exact' })
})
