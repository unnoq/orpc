import type { ClientContext } from '@orpc/client'
import type { SetOptional } from '@orpc/shared'
import type { QueryFunctionContext, QueryKey, UseInfiniteQueryOptions, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'

export type QueryOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error, TSelectData> =
  & (undefined extends TInput ? { input?: TInput } : { input: TInput })
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & SetOptional<UseQueryOptions<TOutput, TError, TSelectData>, 'queryKey'>

export interface QueryOptionsBase<TOutput, TError extends Error> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type InfiniteOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error, TSelectData, TPageParam> =
  & { input: (pageParam: TPageParam) => TInput }
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & SetOptional<UseInfiniteQueryOptions<TOutput, TError, TSelectData, TOutput, QueryKey, TPageParam>, 'queryKey'>

export interface InfiniteOptionsBase<TOutput, TError extends Error, TPageParam> {
  queryKey: QueryKey
  queryFn(ctx: QueryFunctionContext<QueryKey, TPageParam>): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type MutationOptionsIn<TClientContext extends ClientContext, TInput, TOutput, TError extends Error, TMutationContext> =
  & (Record<never, never> extends TClientContext ? { context?: TClientContext } : { context: TClientContext })
  & UseMutationOptions<TOutput, TError, TInput, TMutationContext>

export interface MutationOptionsBase<TInput, TOutput, TError extends Error> {
  mutationKey: QueryKey
  mutationFn(input: TInput): Promise<TOutput>
  retry?(failureCount: number, error: TError): boolean // this make tanstack can infer the TError type
}

export type MutationOptionsRest<T> = Record<never, never> extends T ? [] : [options: T]
