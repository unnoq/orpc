import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { InferCursor, SchemaInputForInfiniteQuery } from './types'
import {
  get,
  type PartialOnUndefinedDeep,
  type SetOptional,
} from '@orpc/shared'
import {
  type DefaultError,
  type FetchInfiniteQueryOptions,
  type FetchQueryOptions,
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  usePrefetchInfiniteQuery,
  usePrefetchQuery,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  useSuspenseInfiniteQuery,
  type UseSuspenseInfiniteQueryOptions,
  type UseSuspenseInfiniteQueryResult,
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { orpcPathSymbol } from './orpc-path'
import { type ORPCContext, useORPCContext } from './react-context'
import { getMutationKeyFromPath, getQueryKeyFromPath } from './tanstack-key'

export interface ProcedureHooks<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> {
  useQuery: <USelectData = SchemaOutput<TOutputSchema, TFuncOutput>>(
    input: SchemaInput<TInputSchema>,
    options?: SetOptional<
      UseQueryOptions<
        SchemaOutput<TOutputSchema, TFuncOutput>,
        DefaultError,
        USelectData
      >,
      'queryFn' | 'queryKey'
    >,
  ) => UseQueryResult<USelectData>
  useInfiniteQuery: <
    USelectData = InfiniteData<
      SchemaOutput<TOutputSchema, TFuncOutput>,
      InferCursor<TInputSchema>
    >,
  >(
    options: PartialOnUndefinedDeep<
      SetOptional<
        UseInfiniteQueryOptions<
          SchemaOutput<TOutputSchema, TFuncOutput>,
          DefaultError,
          USelectData,
          SchemaOutput<TOutputSchema, TFuncOutput>,
          QueryKey,
          InferCursor<TInputSchema>
        >,
        'queryFn' | 'queryKey'
      > & {
        input: SchemaInputForInfiniteQuery<TInputSchema>
      }
    >,
  ) => UseInfiniteQueryResult<USelectData>

  useSuspenseQuery: <USelectData = SchemaOutput<TOutputSchema, TFuncOutput>>(
    input: SchemaInput<TInputSchema>,
    options?: SetOptional<
      UseSuspenseQueryOptions<
        SchemaOutput<TOutputSchema, TFuncOutput>,
        DefaultError,
        USelectData
      >,
      'queryFn' | 'queryKey'
    >,
  ) => UseSuspenseQueryResult<USelectData>
  useSuspenseInfiniteQuery: <
    USelectData = InfiniteData<
      SchemaOutput<TOutputSchema, TFuncOutput>,
      InferCursor<TInputSchema>
    >,
  >(
    options: PartialOnUndefinedDeep<
      SetOptional<
        UseSuspenseInfiniteQueryOptions<
          SchemaOutput<TOutputSchema, TFuncOutput>,
          DefaultError,
          USelectData,
          SchemaOutput<TOutputSchema, TFuncOutput>,
          QueryKey,
          InferCursor<TInputSchema>
        >,
        'queryFn' | 'queryKey'
      > & {
        input: SchemaInputForInfiniteQuery<TInputSchema>
      }
    >,
  ) => UseSuspenseInfiniteQueryResult<USelectData>

  usePrefetchQuery: (
    input: SchemaInput<TInputSchema>,
    options?: FetchQueryOptions<SchemaOutput<TOutputSchema, TFuncOutput>>,
  ) => void
  usePrefetchInfiniteQuery: (
    options: PartialOnUndefinedDeep<
      SetOptional<
        FetchInfiniteQueryOptions<
          SchemaOutput<TOutputSchema, TFuncOutput>,
          DefaultError,
          SchemaOutput<TOutputSchema, TFuncOutput>,
          QueryKey,
          InferCursor<TInputSchema>
        >,
        'queryKey' | 'queryFn'
      > & {
        input: SchemaInputForInfiniteQuery<TInputSchema>
      }
    >,
  ) => void

  useMutation: (
    options?: SetOptional<
      UseMutationOptions<
        SchemaOutput<TOutputSchema, TFuncOutput>,
        DefaultError,
        SchemaInput<TInputSchema>
      >,
      'mutationFn' | 'mutationKey'
    >,
  ) => UseMutationResult<
    SchemaOutput<TOutputSchema, TFuncOutput>,
    DefaultError,
    SchemaInput<TInputSchema>
  >
}

export interface CreateProcedureHooksOptions {
  context: ORPCContext<any>

  /**
   * The path of the procedure on server.
   *
   * @internal
   */
  path: string[]
}

export function createProcedureHooks<
  TInputSchema extends Schema = undefined,
  TOutputSchema extends Schema = undefined,
  TFuncOutput extends
  SchemaOutput<TOutputSchema> = SchemaOutput<TOutputSchema>,
>(
  options: CreateProcedureHooksOptions,
): ProcedureHooks<TInputSchema, TOutputSchema, TFuncOutput> {
  return {
    [orpcPathSymbol as any]: options.path,

    useQuery(input, options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
          queryFn: ({ signal }) => client(input, { signal }),
          ...options_,
        },
        context.queryClient,
      )
    },
    useInfiniteQuery(options_) {
      const { input, ...rest } = options_
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useInfiniteQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          queryFn: ({ pageParam, signal }) =>
            client({ ...(input as any), cursor: pageParam }, { signal }),
          ...(rest as any),
        },
        context.queryClient,
      )
    },

    useSuspenseQuery(input, options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useSuspenseQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
          queryFn: ({ signal }) => client(input, { signal }),
          ...options_,
        },
        context.queryClient,
      )
    },
    useSuspenseInfiniteQuery(options_) {
      const { input, ...rest } = options_
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useSuspenseInfiniteQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          queryFn: ({ pageParam, signal }) =>
            client({ ...(input as any), cursor: pageParam }, { signal }),
          ...(rest as any),
        },
        context.queryClient,
      )
    },

    usePrefetchQuery(input, options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return usePrefetchQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, { input, type: 'query' }),
          queryFn: ({ signal }) => client(input, { signal }),
          ...options_,
        },
        context.queryClient,
      )
    },
    usePrefetchInfiniteQuery(options_) {
      const { input, ...rest } = options_
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return usePrefetchInfiniteQuery(
        {
          queryKey: getQueryKeyFromPath(options.path, {
            input,
            type: 'infinite',
          }),
          queryFn: ({ pageParam, signal }) =>
            client({ ...(input as any), cursor: pageParam }, { signal }),
          ...(rest as any),
        },
        context.queryClient,
      )
    },

    useMutation(options_) {
      const context = useORPCContext(options.context)
      const client = get(context.client, options.path) as any
      return useMutation(
        {
          mutationKey: getMutationKeyFromPath(options.path),
          mutationFn: input => client(input),
          ...options_,
        },
        context.queryClient,
      )
    },
  }
}
