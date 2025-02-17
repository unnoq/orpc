import type { ErrorMap, Meta, Schema } from '@orpc/contract'
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

export interface MiddlewareNextFn<TInContext extends Context, TOutput> {
  <U extends Context & Partial<TInContext> = Record<never, never>>(
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
  path: string[]
  procedure: Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, TMeta>
  signal?: AbortSignal
  lastEventId: string | undefined
  next: MiddlewareNextFn<TInContext, TOutput>
  errors: TErrorConstructorMap
}

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
