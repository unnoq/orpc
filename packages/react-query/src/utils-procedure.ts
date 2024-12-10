import type { IsEqual, SetOptional } from '@orpc/shared'
import type { DefaultError, QueryKey, UseMutationOptions } from '@tanstack/react-query'
import type { InfiniteOptions, QueryOptions } from './types'
import { buildKey } from './key'

/**
 * Utils at procedure level
 */
export interface ProcedureUtils<TInput, TOutput> {
  queryOptions: <U extends QueryOptions<TInput, TOutput, TOutput>>(
    ...options: [U] | (undefined extends TInput ? [] : never)
  ) => IsEqual<U, QueryOptions<TInput, TOutput, TOutput>> extends true
    ? { queryKey: QueryKey, queryFn: () => Promise<TOutput> }
    : Omit<{ queryKey: QueryKey, queryFn: () => Promise<TOutput> }, keyof U> & U

  infiniteOptions: <U extends InfiniteOptions<TInput, TOutput, any>>(
    options: U
  ) => Omit<{ queryKey: QueryKey, queryFn: () => Promise<TOutput>, initialPageParam: undefined }, keyof U> & U

  mutationOptions: (
    options?: SetOptional<UseMutationOptions<TOutput, DefaultError, TInput>, 'mutationFn' | 'mutationKey'>
  ) => UseMutationOptions<TOutput, DefaultError, TInput>
}

export function createProcedureUtils<TInput, TOutput>(
  client: (input: TInput) => Promise<TOutput>,
  path: string[],
): ProcedureUtils<TInput, TOutput> {
  return {
    queryOptions(...[options]) {
      const input = options?.input as any

      const result = {
        queryKey: buildKey(path, { type: 'query', input }),
        queryFn: () => client(input),
        ...options,
      }

      return result as any
    },

    infiniteOptions(options) {
      const input = options.input as any

      const result = {
        queryKey: buildKey(path, { type: 'infinite', input }),
        queryFn: ({ pageParam }: { pageParam: any }) => client({ ...input, cursor: pageParam }),
        ...(options as any),
      }

      return result
    },

    mutationOptions(options) {
      return {
        mutationKey: buildKey(path, { type: 'mutation' }),
        mutationFn: input => client(input),
        ...options,
      }
    },
  }
}
