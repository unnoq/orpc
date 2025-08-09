import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/vue-query'
import type { experimental_InferStreamedOutput, experimental_StreamedOptionsBase, experimental_StreamedOptionsIn, InfiniteOptionsBase, InfiniteOptionsIn, MutationOptions, MutationOptionsIn, QueryOptionsBase, QueryOptionsIn } from './types'
import { isAsyncIteratorObject } from '@orpc/shared'
import { generateOperationKey } from '@orpc/tanstack-query'
import { experimental_streamedQuery, skipToken } from '@tanstack/vue-query'
import { computed } from 'vue'
import { unrefDeep } from './utils'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> {
  /**
   * Calling corresponding procedure client
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query-old/basic#calling-procedure-clients Tanstack Calling Procedure Client Docs}
   */
  call: Client<TClientContext, TInput, TOutput, TError>

  /**
   * Generate options used for useQuery/prefetchQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query-old/basic#query-options-utility Tanstack Query Options Utility Docs}
   */
  queryOptions<U, USelectData = TOutput>(
    ...rest: MaybeOptionalOptions<
      U & QueryOptionsIn<TClientContext, TInput, TOutput, TError, USelectData>
    >
  ): NoInfer<U & Omit<QueryOptionsBase<TOutput, TError>, keyof U>>

  /**
   * Generate [Event Iterator](https://orpc.unnoq.com/docs/event-iterator) options used for useQuery/prefetchQuery/...
   * Built on top of [steamedQuery](https://tanstack.com/query/latest/docs/reference/streamedQuery)
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query-old/basic#streamed-query-options-utility Tanstack Streamed Query Options Utility Docs}
   */
  experimental_streamedOptions<U, USelectData = experimental_InferStreamedOutput<TOutput>>(
    ...rest: MaybeOptionalOptions<
      U & experimental_StreamedOptionsIn<TClientContext, TInput, experimental_InferStreamedOutput<TOutput>, TError, USelectData>
    >
  ): NoInfer<U & Omit<experimental_StreamedOptionsBase<experimental_InferStreamedOutput<TOutput>, TError>, keyof U>>

  /**
   * Generate options used for useInfiniteQuery/prefetchInfiniteQuery/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query-old/basic#infinite-query-options-utility Tanstack Infinite Query Options Utility Docs}
   */
  infiniteOptions<U, UPageParam, USelectData = InfiniteData<TOutput, UPageParam>>(
    options: U & InfiniteOptionsIn<TClientContext, TInput, TOutput, TError, USelectData, UPageParam>
  ): NoInfer<U & Omit<InfiniteOptionsBase<TOutput, TError, UPageParam>, keyof U>>

  /**
   * Generate options used for useMutation/...
   *
   * @see {@link https://orpc.unnoq.com/docs/integrations/tanstack-query-old/basic#mutation-options Tanstack Mutation Options Docs}
   */
  mutationOptions<UMutationContext>(
    ...rest: MaybeOptionalOptions<MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>>
  ): MutationOptions<TInput, TOutput, TError, UMutationContext>
}

export interface CreateProcedureUtilsOptions {
  path: string[]
}

export function createProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError>(
  client: Client<TClientContext, TInput, TOutput, TError>,
  options: CreateProcedureUtilsOptions,
): ProcedureUtils<TClientContext, TInput, TOutput, TError> {
  return {
    call: client,

    queryOptions(...[optionsIn = {} as any]) {
      return {
        queryKey: computed(() => generateOperationKey(options.path, { type: 'query', input: unrefDeep(optionsIn.input) })),
        queryFn: ({ signal }) => {
          const input = unrefDeep(optionsIn.input)

          if (input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(input, { signal, context: unrefDeep(optionsIn.context) })
        },
        enabled: computed(() => unrefDeep(optionsIn.input) === skipToken ? false : undefined),
        ...optionsIn,
      }
    },

    experimental_streamedOptions(...[optionsIn = {} as any]) {
      return {
        enabled: computed(() => unrefDeep(optionsIn.input) === skipToken ? false : undefined),
        queryKey: computed(() => generateOperationKey(options.path, { type: 'streamed', input: unrefDeep(optionsIn.input), fnOptions: optionsIn.queryFnOptions })),
        queryFn: experimental_streamedQuery({
          queryFn: async ({ signal }) => {
            const input = unrefDeep(optionsIn.input)

            if (input === skipToken) {
              throw new Error('queryFn should not be called with skipToken used as input')
            }

            const output = await client(input, { signal, context: unrefDeep(optionsIn.context) })

            if (!isAsyncIteratorObject(output)) {
              throw new Error('streamedQuery requires an event iterator output')
            }

            return output
          },
          ...optionsIn.queryFnOptions,
        }),
        ...optionsIn,
      }
    },

    infiniteOptions(optionsIn) {
      return {
        queryKey: computed(() => {
          const input = unrefDeep(optionsIn.input)

          return generateOperationKey(options.path, {
            type: 'infinite',
            input: input === skipToken ? skipToken : unrefDeep(input(unrefDeep(optionsIn.initialPageParam) as any)) as any,
          })
        }),
        queryFn: ({ pageParam, signal }) => {
          const input = unrefDeep(optionsIn.input)

          if (input === skipToken) {
            throw new Error('queryFn should not be called with skipToken used as input')
          }

          return client(unrefDeep(input(pageParam as any) as any), { signal, context: unrefDeep(optionsIn.context) as any })
        },
        enabled: computed(() => unrefDeep(optionsIn.input) === skipToken ? false : undefined),
        ...(optionsIn as any),
      }
    },

    mutationOptions(...[optionsIn = {} as any]) {
      return {
        mutationKey: generateOperationKey(options.path, { type: 'mutation' }),
        mutationFn: input => client(input, { context: unrefDeep(optionsIn.context) }),
        ...(optionsIn as any),
      }
    },
  }
}
