/// <reference lib="dom" />

import type { ANY_PROCEDURE } from './procedure'

export type Context = Record<string, any> | undefined
export type WELL_CONTEXT = Record<string, unknown> | undefined

export type MergeContext<
  TA extends Context,
  TB extends Context,
> = TA extends undefined ? TB : TB extends undefined ? TA : TA & TB

export interface CallerOptions {
  signal?: AbortSignal
}

export interface Caller<TInput, TOutput> {
  (...opts: [input: TInput, options?: CallerOptions] | (undefined extends TInput ? [] : never)): Promise<TOutput>
}

export interface Meta extends CallerOptions {
  path: string[]
  procedure: ANY_PROCEDURE
}
