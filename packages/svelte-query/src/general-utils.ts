import type { OperationKeyOptions, OperationType } from '@orpc/tanstack-query'
import type { QueryKey } from '@tanstack/svelte-query'
import { generateOperationKey } from '@orpc/tanstack-query'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  /**
   * Generate a query/mutation key for checking status, invalidate, set, get, etc.
   *
   * @see {@link https://orpc.dev/docs/integrations/tanstack-query-old/basic#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  key<UType extends OperationType>(options?: OperationKeyOptions<UType, TInput>): QueryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return generateOperationKey(path, options)
    },
  }
}
