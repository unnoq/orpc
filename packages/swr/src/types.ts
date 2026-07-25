import type { ClientContext } from '@orpc/client'
import type { PartialDeep } from '@orpc/shared'
import type { SWRSubscriptionOptions } from 'swr/subscription'
import type { OperationKey } from './key'

export type InferSubscriberOutput<TOutput> = TOutput extends AsyncIterable<infer U> ? U[] : never
export type InferLiveSubscriberOutput<TOutput> = TOutput extends AsyncIterable<infer U> ? U : never

export type OperationType = 'fetcher' | 'mutator' | 'subscriber' | 'liveSubscriber'

export const OPERATION_CONTEXT_SYMBOL: unique symbol = Symbol.for('ORPC_SWR_OPERATION_CONTEXT') as any

export interface OperationContext {
  [OPERATION_CONTEXT_SYMBOL]?: {
    key: unknown
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

export type Matcher = (key?: unknown) => boolean

export type FetcherOptions<TClientContext extends ClientContext>
  = object extends TClientContext ? { context?: TClientContext } : { context: TClientContext }

export type SubscriberOptions<TClientContext extends ClientContext> = FetcherOptions<TClientContext> & {
  /**
   * Determines how data is handled when the subscription refetches.
   * - `reset`: Replace existing data with new data
   * - `append`: Add new data to existing data
   *
   * @default 'reset'
   */
  refetchMode?: 'reset' | 'append'

  /**
   * Maximum number of chunks to store.
   * When exceeded, the oldest chunks will be removed.
   */
  maxChunks?: number
}

export type MutatorOptions<TClientContext extends ClientContext> = FetcherOptions<TClientContext>

export type Fetcher<TInput, TOutput> = (key: OperationKey<TInput>) => Promise<TOutput>

export type Mutator<TInput, TOutput> = (key: unknown, options: Readonly<{ arg: TInput }>) => Promise<TOutput>

export type Subscriber<TInput, TData, TError> = (
  key: OperationKey<TInput>,
  options: SWRSubscriptionOptions<TData, TError>,
) => (() => void)
