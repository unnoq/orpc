import type { QueryKey } from '@tanstack/react-query'
import type { BuildKeyOptions, KeyType } from './key'
import { buildKey } from './key'

/**
 * Utils at any level (procedure or router)
 */
export interface GeneralUtils<TInput> {
  key: <UType extends KeyType = undefined>(options?: BuildKeyOptions<UType, TInput>) => QueryKey
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
