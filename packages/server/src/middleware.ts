import type { Promisable } from '@orpc/shared'
import type { Context, Meta } from './types'

export type MiddlewareResult<TExtraContext extends Context, TOutput> = Promisable<{
  output: TOutput
  context: TExtraContext
}>

export interface MiddlewareMeta<TOutput> extends Meta {
  next: <UExtraContext extends Context = undefined>(
    options: UExtraContext extends undefined ? { context?: UExtraContext } : { context: UExtraContext }
  ) => MiddlewareResult<UExtraContext, TOutput>
  output: <UOutput>(output: UOutput) => MiddlewareResult<undefined, UOutput>
}

export interface Middleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> {
  (
    input: TInput,
    context: TContext,
    meta: MiddlewareMeta<TOutput>,
  ): Promisable<
    MiddlewareResult<TExtraContext, TOutput>
  >
}

export type ANY_MIDDLEWARE = Middleware<any, any, any, any>

export interface MapInputMiddleware<TInput, TMappedInput> {
  (input: TInput): TMappedInput
}

export type ANY_MAP_INPUT_MIDDLEWARE = MapInputMiddleware<any, any>
