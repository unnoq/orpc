import type { Client, ORPCError } from '@orpc/client'
import type { Public } from '@orpc/shared'
import type { ComputedRef } from 'vue'
import type { ProcedureUtils } from './procedure-utils'
import { ref } from 'vue'

describe('procedureUtils', () => {
  type UtilsInput = { search?: string, cursor?: number } | undefined
  type UtilsOutput = { title: string }[]
  type UtilsError = ORPCError<'BASE', { output: string }> | Error

  const optionalUtils = {} as Public<ProcedureUtils<
    { batch?: boolean },
    UtilsInput,
    UtilsOutput,
    UtilsError
  >>

  const requiredUtils = {} as Public<ProcedureUtils<
    { batch: boolean },
    'input',
    UtilsOutput,
    Error
  >>

  it('.call', () => {
    expectTypeOf(optionalUtils.call).toEqualTypeOf<
      Client<{ batch?: boolean }, UtilsInput, UtilsOutput, UtilsError>
    >()
  })

  describe('.key', () => {
    it('should handle optional `input` correctly', () => {
      optionalUtils.key()
      optionalUtils.key({ })
      optionalUtils.key({ input: { search: 'search' } })
    })

    it('should handle required `input` correctly', () => {
      // @ts-expect-error - `input` is required
      requiredUtils.key()
    })

    it('should infer types for `input` correctly', () => {
      optionalUtils.key({ input: { cursor: 1 } })
      // @ts-expect-error - Should error on invalid input type
      optionalUtils.key({ input: { cursor: 'invalid' } })
      // @ts-expect-error - Should error on non-existent input property
      optionalUtils.key({ input: { cursor: 1, nonExistent: true } })

      requiredUtils.key({ input: 'input' })
      // @ts-expect-error - Should error on invalid input type
      requiredUtils.key({ input: 123 })
    })

    it('return valid key', () => {
      expectTypeOf(optionalUtils.key()).toEqualTypeOf<string>()
      expectTypeOf(optionalUtils.key({ input: { search: 'search' } })).toEqualTypeOf<string>()
    })
  })

  describe('.asyncDataArgs', () => {
    it('should handle optional `input` and `context` correctly', () => {
      optionalUtils.asyncDataArgs()
      optionalUtils.asyncDataArgs({})
      optionalUtils.asyncDataArgs({ input: { search: 'search' } })
      optionalUtils.asyncDataArgs({ input: ref({ search: 'search' }) })
      optionalUtils.asyncDataArgs({ input: () => ({ search: 'search' }) })
      optionalUtils.asyncDataArgs({ context: { batch: true } })
    })

    it('should handle required `input` and `context` correctly', () => {
      // @ts-expect-error - `input` and `context` are required
      requiredUtils.asyncDataArgs()
      // @ts-expect-error - `context` is required
      requiredUtils.asyncDataArgs({ input: 'input' })
      // @ts-expect-error - `input` is required
      requiredUtils.asyncDataArgs({ context: { batch: true } })
      requiredUtils.asyncDataArgs({ input: 'input', context: { batch: true } })
      requiredUtils.asyncDataArgs({ input: ref('input' as const), context: { batch: true } })
    })

    it('should infer types for `input` correctly', () => {
      // @ts-expect-error - Should error on invalid input type
      optionalUtils.asyncDataArgs({ input: { cursor: 'invalid' } })
      // @ts-expect-error - Should error on invalid reactive input type
      optionalUtils.asyncDataArgs({ input: ref({ cursor: 'invalid' }) })
      // @ts-expect-error - Should error on invalid context type
      optionalUtils.asyncDataArgs({ context: { batch: 'invalid' } })
    })

    it('return valid args', () => {
      const [key, handler] = optionalUtils.asyncDataArgs()

      expectTypeOf(key).toEqualTypeOf<ComputedRef<string>>()
      expectTypeOf<Awaited<ReturnType<typeof handler>>>().toEqualTypeOf<UtilsOutput>()
    })
  })
})
