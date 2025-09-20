import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { DataTag, InfiniteData, QueryKey } from '@tanstack/query-core'
import type {
  experimental_LiveQueryOutput,
  experimental_StreamedKeyOptions,
  experimental_StreamedQueryOutput,
  InfiniteOptionsBase,
  InfiniteOptionsIn,
  MutationOptions,
  MutationOptionsIn,
  OperationContext,
  QueryKeyOptions,
  QueryOptionsBase,
  QueryOptionsIn,
  experimental_StreamedOptionsBase as StreamedOptionsBase,
  experimental_StreamedOptionsIn as StreamedOptionsIn,
} from './types'
import { isAsyncIteratorObject } from '@orpc/shared'
import { experimental_streamedQuery, skipToken } from '@tanstack/query-core'
import { generateOperationKey } from './key'
import { experimental_liveQuery } from './live-query'
import {
  OPERATION_CONTEXT_SYMBOL,
} from './types'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> {
  /**
   * Calling corresponding procedure client
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#calling-clients Tanstack Calling Procedure Client Docs}
   */
  call: Client<TClientContext, TInput, TOutput, TError>

  /**
   * Generate a **full matching** key for [Query Options](https://orpc.unnoq.com/docs/integrations/tanstack-query#query-options).
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  queryKey(
    ...rest: MaybeOptionalOptions<
      QueryKeyOptions<TInput>
    >
  ): DataTag<QueryKey, TOutput, TError>

  /**
   * Generate options used for useQuery/useSuspenseQuery/prefetchQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-options Tanstack Query Options Utility Docs}
   */
  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & Omit<QueryOptionsBase<TOutput, TError>, keyof U>>

  /**
   * Generate a **full matching** key for [Streamed Query Options](https://orpc.unnoq.com/docs/integrations/tanstack-query#streamed-query-options).
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  experimental_streamedKey(
    ...rest: MaybeOptionalOptions<
      experimental_StreamedKeyOptions<TInput>
    >
  ): DataTag<QueryKey, experimental_StreamedQueryOutput<TOutput>, TError>

  /**
   * Configure queries for [Event Iterator](https://orpc.unnoq.com/docs/event-iterator).
   * This is built on [TanStack Query streamedQuery](https://tanstack.com/query/latest/docs/reference/streamedQuery)
   * and works with hooks like `useQuery`, `useSuspenseQuery`, or `prefetchQuery`.
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#streamed-query-options Tanstack Streamed Query Options Utility Docs}
   */
  experimental_streamedOptions<U, USelectData = experimental_StreamedQueryOutput<TOutput>>(
    ...rest: MaybeOptionalOptions<
      U & StreamedOptionsIn<TClientContext, TInput, experimental_StreamedQueryOutput<TOutput>, TError, USelectData>
    >
  ): NoInfer<U & Omit<StreamedOptionsBase<experimental_StreamedQueryOutput<TOutput>, TError>, keyof U>>

  /**
   * Generate a **full matching** key for [Live Query Options](https://orpc.unnoq.com/docs/integrations/tanstack-query#live-query-options).
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  experimental_liveKey(
    ...rest: MaybeOptionalOptions<
      QueryKeyOptions<TInput>
    >
  ): DataTag<QueryKey, experimental_LiveQueryOutput<TOutput>, TError>

  /**
   * Configure live queries for [Event Iterator](https://orpc.unnoq.com/docs/event-iterator).
   * Unlike `.streamedOptions` which accumulates chunks, live queries replace the entire result with each new chunk received.
   * Works with hooks like `useQuery`, `useSuspenseQuery`, or `prefetchQuery`.
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#live-query-options Tanstack Live Query Options Utility Docs}
   */
  experimental_liveOptions<U, USelectData = experimental_LiveQueryOutput<TOutput>>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, experimental_LiveQueryOutput<TOutput>, TError, USelectData>
    >
  ): NoInfer<U & Omit<QueryOptionsBase<experimental_LiveQueryOutput<TOutput>, TError>, keyof U>>

  /**
   * Generate a **full matching** key for [Infinite Query Options](https://orpc.unnoq.com/docs/integrations/tanstack-query#infinite-query-options).
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  infiniteKey<UPageParam>(
    options: Pick<
      InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, InfiniteData<TOutput, UPageParam>, UPageParam>,
      'input' | 'initialPageParam' | 'queryKey'
    >
  ): DataTag<QueryKey, InfiniteData<TOutput, UPageParam>, TError>

  /**
   * Generate options used for useInfiniteQuery/useSuspenseInfiniteQuery/prefetchInfiniteQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#infinite-query-options Tanstack Infinite Query Options Utility Docs}
   */
  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput, UPageParam>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & Omit<InfiniteOptionsBase<TOutput, TError, UPageParam>, keyof U>>

  /**
   * Generate a **full matching** key for [Mutation Options](https://orpc.unnoq.com/docs/integrations/tanstack-query#mutation-options).
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#query-mutation-key Tanstack Query/Mutation Key Docs}
   */
  mutationKey(
    options?: Pick<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError, any>,
      'mutationKey'
    >
  ): DataTag<QueryKey, TOutput, TError>

  /**
   * Generate options used for useMutation/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query#mutation-options Tanstack Mutation Options Docs}
   */
  mutationOptions<UMutationContext>(
    ...rest: MaybeOptionalOptions<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>
    >
  ): NoInfer<MutationOptions<TInput, TOutput, TError, UMutationContext>>
}

export interface CreateProcedureUtilsOptions {
  path: readonly string[]
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  options: CreateProcedureUtilsOptions,
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  const utils: ProcedureUtils<TClientContext, TInput, TOutput, TError> = {
    call: client,

    queryKey(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'query', input: optionsIn.input })

      return queryKey
    },

    queryOptions(...[optionsIn = {} as any]) {
      const queryKey = utils.queryKey(optionsIn)

      return {
        queryFn: ({ signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(optionsIn.input, {
            signal,
            context: {
              [OPERATION_CONTEXT_SYMBOL]: {
                key: queryKey,
                type: 'query',
              },
              ...optionsIn.context,
            } satisfies OperationContext,
          })
        },
        ...optionsIn.input === skipToken ? { enabled: false } : {},
        ...optionsIn,
        queryKey,
      }
    },

    experimental_streamedKey(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'streamed', input: optionsIn.input, fnOptions: optionsIn.queryFnOptions })

      return queryKey
    },

    experimental_streamedOptions(...[optionsIn = {} as any]) {
      const queryKey = utils.experimental_streamedKey(optionsIn)

      return {
        queryFn: experimental_streamedQuery({
          streamFn: async ({ signal }) => {
            if (optionsIn.input === skipToken) {
              throw new Error('queryFn should not be called with skipToken used as input')
            }

            const output = await client(optionsIn.input, {
              signal,
              context: {
                [OPERATION_CONTEXT_SYMBOL]: {
                  key: queryKey,
                  type: 'streamed',
                },
                ...optionsIn.context,
              } satisfies OperationContext,
            })

            if (!isAsyncIteratorObject(output)) {
              throw new Error('streamedQuery requires an event iterator output')
            }

            return output
          },
          ...optionsIn.queryFnOptions,
        }),
        ...optionsIn.input === skipToken ? { enabled: false } : {},
        ...optionsIn,
        queryKey,
      }
    },

    experimental_liveKey(...[optionsIn = {} as any]) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, { type: 'live', input: optionsIn.input })

      return queryKey
    },

    experimental_liveOptions(...[optionsIn = {} as any]) {
      const queryKey = utils.experimental_liveKey(optionsIn)

      return {
        queryFn: experimental_liveQuery(async ({ signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          const output = await client(optionsIn.input, {
            signal,
            context: {
              [OPERATION_CONTEXT_SYMBOL]: {
                key: queryKey,
                type: 'live',
              },
              ...optionsIn.context,
            } satisfies OperationContext,
          })

          if (!isAsyncIteratorObject(output)) {
            throw new Error('liveQuery requires an event iterator output')
          }

          return output
        }),
        ...optionsIn.input === skipToken ? { enabled: false } : {},
        ...optionsIn,
        queryKey,
      }
    },

    infiniteKey(optionsIn) {
      const queryKey = optionsIn.queryKey ?? generateOperationKey(options.path, {
        type: 'infinite',
        input: optionsIn.input === skipToken ? skipToken : optionsIn.input(optionsIn.initialPageParam) as any,
      })

      return queryKey as any
    },

    infiniteOptions(optionsIn) {
      const queryKey = utils.infiniteKey(optionsIn as any)

      return {
        queryFn: ({ pageParam, signal }) => {
          if (optionsIn.input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(optionsIn.input(pageParam as any), {
            signal,
            context: {
              [OPERATION_CONTEXT_SYMBOL]: {
                key: queryKey,
                type: 'infinite',
              } satisfies OperationContext[typeof OPERATION_CONTEXT_SYMBOL],
              ...optionsIn.context,
            } as any,
          })
        },
        ...optionsIn.input === skipToken ? { enabled: false } : {},
        ...(optionsIn as any),
        queryKey,
      }
    },

    mutationKey(...[optionsIn = {} as any]) {
      const mutationKey = optionsIn.mutationKey ?? generateOperationKey(options.path, { type: 'mutation' })

      return mutationKey
    },

    mutationOptions(...[optionsIn = {} as any]) {
      const mutationKey = utils.mutationKey(optionsIn)

      return {
        mutationFn: input => client(input, {
          context: {
            [OPERATION_CONTEXT_SYMBOL]: {
              key: mutationKey,
              type: 'mutation',
            },
            ...optionsIn.context,
          } satisfies OperationContext,
        }),
        ...(optionsIn as any),
        mutationKey,
      }
    },
  }

  return utils
}
