import type { Promisable } from '@orpc/shared'
import type { ANY_PROCEDURE } from './procedure'
import type { Context } from './types'

export type MiddlewareResult<TExtraContext extends Context, TOutput> = Promisable<{
  output: TOutput
  context: TExtraContext
}>

export interface MiddlewareNextFn<TOutput> {
  <UExtraContext extends Context = undefined>(
    options: UExtraContext extends undefined ? { context?: UExtraContext } : { context: UExtraContext }
  ): MiddlewareResult<UExtraContext, TOutput>
}

export interface MiddlewareOutputFn<TOutput> {
  (output: TOutput): MiddlewareResult<undefined, TOutput>
}

export interface MiddlewareOptions<TContext extends Context, TOutput> {
  context: TContext
  path: string[]
  procedure: ANY_PROCEDURE
  signal?: AbortSignal
  next: MiddlewareNextFn<TOutput>
}

export interface Middleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> {
  (
    options: MiddlewareOptions<TContext, TOutput>,
    input: TInput,
    output: MiddlewareOutputFn<TOutput>,
  ): Promisable<
    MiddlewareResult<TExtraContext, TOutput>
  >
}

export type ANY_MIDDLEWARE = Middleware<any, any, any, any>

export interface MapInputMiddleware<TInput, TMappedInput> {
  (input: TInput): TMappedInput
}

export type ANY_MAP_INPUT_MIDDLEWARE = MapInputMiddleware<any, any>
