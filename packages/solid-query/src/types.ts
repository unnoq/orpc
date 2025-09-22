import type { ClientContext } from '@orpc/client'
import type { SetOptional } from '@orpc/shared'
import type {
  QueryFunctionContext,
  QueryKey,
  SkipToken,
  SolidInfiniteQueryOptions,
  SolidMutationOptions,
  SolidQueryOptions,
} from '@tanstack/solid-query'

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData>
  = & (undefined extends TInput ? { input?: TInput | SkipToken } : { input: TInput | SkipToken })
    & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & SetOptional<SolidQueryOptions<TOutput, TError, TSelectData>, 'queryKey'>

export interface QueryOptionsBase<TOutput, TError> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  throwOnError?(error: TError): boolean // Help TQ infer TError
  retryDelay?: (count: number, error: TError) => number // Help TQ infer TError (suspense hooks)
  enabled?: boolean
}

export type InfiniteOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TSelectData, TPageParam>
  = & { input: ((pageParam: TPageParam) => TInput) | SkipToken }
    & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & SetOptional<SolidInfiniteQueryOptions<TOutput, TError, TSelectData, QueryKey, TPageParam>, 'queryKey'>

export interface InfiniteOptionsBase<TOutput, TError, TPageParam> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  throwOnError?(error: TError): boolean // Help TQ infer TError
  retryDelay?: (count: number, error: TError) => number // Help TQ infer TError (suspense hooks)
  enabled?: boolean
}

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError, TMutationContext>
  = & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
    & MutationOptions<TInput, TOutput, TError, TMutationContext>

export type MutationOptions<TInput, TOutput, TError, TMutationContext> = SolidMutationOptions<TOutput, TError, TInput, TMutationContext>
