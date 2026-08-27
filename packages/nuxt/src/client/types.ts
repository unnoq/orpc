import type { ClientContext, ClientPromiseResult } from '@orpc/client'
import type { PartialDeep } from '@orpc/shared'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'

export type OperationType = 'asyncData'

/**
 * The symbol under which Nuxt utils attach operation details
 * (key and operation type) to the client context.
 *
 * @see {@link https://orpc.dev/docs/integrations/nuxt#operation-context | Nuxt Integration - Operation Context}
 */
export const OPERATION_CONTEXT_SYMBOL: unique symbol = Symbol.for('ORPC_NUXT_OPERATION_CONTEXT')

/**
 * A client context automatically populated by Nuxt utils,
 * exposing the operation key and type of the calling operation.
 *
 * @see {@link https://orpc.dev/docs/integrations/nuxt#operation-context | Nuxt Integration - Operation Context}
 */
export interface OperationContext {
  [OPERATION_CONTEXT_SYMBOL]?: {
    key: string
    type: OperationType
  }
}

export type KeyOptions<TInput>
  = undefined extends TInput ? { input?: TInput } : { input: TInput }

export type MatcherStrategy = 'exact' | 'partial'

export type MatcherOptions<TStrategy extends MatcherStrategy, TInput>
  = (
    'partial' extends TStrategy
      ? { input?: PartialDeep<TInput> }
      : undefined extends TInput
        ? { input?: TInput }
        : { input: TInput }
  ) & {
    strategy?: TStrategy
  }

export type Matcher = (key: string) => boolean

export type AsyncDataArgsOptions<TClientContext extends ClientContext, TInput>
  = & (undefined extends TInput ? { input?: MaybeRefOrGetter<TInput> } : { input: MaybeRefOrGetter<TInput> })
    & (object extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

/**
 * Arguments for `useAsyncData` and `useLazyAsyncData`: a reactive key and a handler.
 * Spread them into the composable: `useAsyncData(...args)`.
 */
export type AsyncDataArgs<TOutput, TError> = readonly [
  key: ComputedRef<string>,
  handler: () => ClientPromiseResult<TOutput, TError>,
]
