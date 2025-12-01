import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { _EmptyObject } from '@pinia/colada'
import type { MutationOptions, MutationOptionsIn, QueryOptions, QueryOptionsIn } from './types'
import { computed, toValue } from 'vue'
import { buildKey } from './key'

export interface ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> {
  /**
   * Calling corresponding procedure client
   *
   * @see {@link https://orpc.dev/docs/integrations/pinia-colada#calling-procedure-clients Pinia Colada Calling Procedure Client Docs}
   */
  call: Client<TClientContext, TInput, TOutput, TError>

  /**
   * Generate options used for useQuery/...
   *
   * @see {@link https://orpc.dev/docs/integrations/pinia-colada#query-options-utility Pinia Colada Query Options Utility Docs}
   */
  queryOptions<UInitialData extends TOutput | undefined = TOutput | undefined>(
    ...rest: MaybeOptionalOptions<
      QueryOptionsIn<TClientContext, TInput, TOutput, TError, UInitialData>
    >
  ): NoInfer<QueryOptions<TOutput, TError, UInitialData>>

  /**
   * Generate options used for useMutation/...
   *
   * @see {@link https://orpc.dev/docs/integrations/pinia-colada#mutation-options Pinia Colada Mutation Options Docs}
   */
  mutationOptions<UMutationContext extends Record<any, any> = _EmptyObject>(
    ...rest: MaybeOptionalOptions<
      MutationOptionsIn<TClientContext, TInput, TOutput, TError, UMutationContext>
    >
  ): NoInfer<MutationOptions<TInput, TOutput, TError, UMutationContext>>
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

    queryOptions(...[{ input, context, ...rest } = {}]) {
      return {
        key: computed(() => buildKey(options.path, { type: 'query', input: toValue(input) as any })),
        query: ({ signal }) => client(toValue(input) as any, { signal, context: toValue(context) as any }),
        ...(rest as any),
      }
    },

    mutationOptions(...[{ context, ...rest } = {}]) {
      return {
        key: input => buildKey(options.path, { type: 'mutation', input: input as any }),
        mutation: input => client(input, { context: toValue(context) as any }),
        ...(rest as any),
      }
    },
  }
}
