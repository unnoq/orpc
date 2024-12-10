import type { SetOptional } from '@orpc/shared'
import type {
  DefaultError,
  QueryKey,
  UndefinedInitialDataInfiniteOptions,
  UndefinedInitialDataOptions,
  UseMutationOptions,
} from '@tanstack/react-query'

export type InferCursor<T> = T extends { cursor?: any } ? T['cursor'] : never

export type QueryOptions<TInput, TOutput, TSelectData> = (undefined extends TInput ? { input?: TInput } : { input: TInput }) & (
  SetOptional<UndefinedInitialDataOptions<TOutput, DefaultError, TSelectData, QueryKey>, 'queryKey'>
)

export type InfiniteOptions<TInput, TOutput, TSelectData> = (undefined extends TInput ? { input?: Omit<TInput, 'cursor'> } : { input: Omit<TInput, 'cursor'> }) & (
  SetOptional<
    UndefinedInitialDataInfiniteOptions<TOutput, DefaultError, TSelectData, QueryKey, InferCursor<TInput>>,
    'queryKey' | (undefined extends InferCursor<TInput> ? 'initialPageParam' : never)
  >
)

export type MutationOptions<TInput, TOutput> = UseMutationOptions<TOutput, DefaultError, TInput>
