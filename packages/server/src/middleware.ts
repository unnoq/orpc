import type { AnySchema, ErrorMap, Meta } from '@orpc/contract'
import type { MaybeOptionalOptions, Promisable } from '@orpc/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Procedure } from './procedure'

export type MiddlewareResult<TOutContext extends Context, TOutput> = Promisable<{
  output: TOutput
  context: TOutContext
}>

export type MiddlewareNextFnOptions<TOutContext extends Context> = Record<never, never> extends TOutContext
  ? { context?: TOutContext }
  : { context: TOutContext }

export interface MiddlewareNextFn<TOutput> {
  <U extends Context = Record<never, never>>(
    ...rest: MaybeOptionalOptions<MiddlewareNextFnOptions<U>>
  ): MiddlewareResult<U, TOutput>
}

export interface MiddlewareOutputFn<TOutput> {
  (output: TOutput): MiddlewareResult<Record<never, never>, TOutput>
}

export interface MiddlewareOptions<
  TInContext extends Context,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
> {
  context: TInContext
  path: readonly string[]
  procedure: Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, TMeta>
  signal?: AbortSignal
  lastEventId: string | undefined
  next: MiddlewareNextFn<TOutput>
  errors: TErrorConstructorMap
}

/**
 * A function that represents a middleware.
 *
 * @see {@link https://orpc.dev/docs/middleware Middleware Docs}
 */
export interface Middleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
> {
  (
    options: MiddlewareOptions<TInContext, TOutput, TErrorConstructorMap, TMeta>,
    input: TInput,
    output: MiddlewareOutputFn<TOutput>,
  ): Promisable<
    MiddlewareResult<TOutContext, TOutput>
  >
}

export type AnyMiddleware = Middleware<any, any, any, any, any, any>

export interface MapInputMiddleware<TInput, TMappedInput> {
  (input: TInput): TMappedInput
}

export function middlewareOutputFn<TOutput>(output: TOutput): MiddlewareResult<Record<never, never>, TOutput> {
  return { output, context: {} }
}
