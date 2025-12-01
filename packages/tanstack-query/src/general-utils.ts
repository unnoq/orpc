import type { OperationKey, OperationKeyOptions, OperationType } from './types'
import { generateOperationKey } from './key'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  /**
   * Generate a **partial matching** key for actions like revalidating queries, checking mutation status, etc.
   *
   * @see {@link https://orpc.dev/docs/integrations/tanstack-query#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  key<TType extends OperationType>(options?: OperationKeyOptions<TType, TInput>): OperationKey<TType, TInput>
}

export function createGeneralUtils<TInput>(path: readonly string[]): GeneralUtils<TInput> {
  return {
    key(options) {
      return generateOperationKey(path, options)
    },
  }
}
