import type { EntryKey } from '@pinia/colada'
import type { BuildKeyOptions } from './key'
import { buildKey } from './key'

export interface GeneralUtils<TInput> {
  /**
   * Generate a query/mutation key for checking status, invalidate, set, get, etc.
   *
   * @see {@link https://orpc.dev/docs/integrations/pinia-colada#query-mutation-key Pinia Colada Query/Mutation Key Docs}
   */
  key(options?: BuildKeyOptions<TInput>): EntryKey
}

export function createGeneralUtils<TInput>(
  path: string[],
): GeneralUtils<TInput> {
  return {
    key(options) {
      return buildKey(path, options)
    },
  }
}
