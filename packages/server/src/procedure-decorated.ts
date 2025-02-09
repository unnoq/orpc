import type { ClientRest, ErrorMap, MergedErrorMap, Meta, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import { mergeErrorMap, mergeMeta, mergeRoute } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

export class DecoratedProcedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): DecoratedProcedure<
      TInitialContext,
      TCurrentContext,
      TInputSchema,
      TOutputSchema,
      THandlerOutput,
      MergedErrorMap<TErrorMap, U>,
      TMeta
    > {
    return new DecoratedProcedure({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  meta(
    meta: TMeta,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  use<UOutContext extends Context, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      SchemaOutput<TInputSchema>,
      THandlerOutput,
      UErrorMap,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & DecoratedProcedure<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      THandlerOutput,
      MergedErrorMap<UErrorMap, TErrorMap>,
      TMeta
    >

  use<UOutContext extends Context, UInput, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      THandlerOutput,
      UErrorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema, THandlerOutput>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & DecoratedProcedure<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      THandlerOutput,
      MergedErrorMap<UErrorMap, TErrorMap>,
      TMeta
    >

  use(middleware: AnyMiddleware, mapInput?: MapInputMiddleware<any, any>): DecoratedProcedure<any, any, any, any, any, any, any> {
    const mapped = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new DecoratedProcedure({
      ...this['~orpc'],
      errorMap: mapped['~errorMap']
        ? mergeErrorMap(mapped['~errorMap'], this['~orpc'].errorMap)
        : this['~orpc'].errorMap,
      middlewares: addMiddleware(this['~orpc'].middlewares, mapped),
    })
  }

  /**
   * Make this procedure callable (works like a function while still being a procedure).
   */
  callable<TClientContext>(
    ...rest: CreateProcedureClientRest<TInitialContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta, TClientContext>
  ): Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>
    & ProcedureClient<TClientContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap> {
    return Object.assign(createProcedureClient(this, ...rest), {
      '~type': 'Procedure' as const,
      '~orpc': this['~orpc'],
    })
  }

  /**
   * Make this procedure compatible with server action (the same as .callable, but the type is compatible with server action).
   */
  actionable<TClientContext>(
    ...rest: CreateProcedureClientRest<TInitialContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta, TClientContext>
  ):
    & Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>
    & ((...rest: ClientRest<TClientContext, SchemaInput<TInputSchema>>) => Promise<SchemaOutput<TOutputSchema, THandlerOutput>>) {
    return this.callable(...rest)
  }
}
