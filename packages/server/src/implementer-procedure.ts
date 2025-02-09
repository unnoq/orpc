import type { ClientRest, ErrorMap, MergedErrorMap, Meta, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { BuilderDef } from './builder'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { Procedure, ProcedureHandler } from './procedure'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import type { DecoratedProcedure } from './procedure-decorated'

/**
 * Like `DecoratedProcedure`, but removed all method that can change the contract.
 * It must backward compatible with `DecoratedProcedure`.
 */
export interface ImplementedProcedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta> {
  use<U extends Context, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      U,
      SchemaOutput<TInputSchema>,
      THandlerOutput,
      UErrorMap,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & DecoratedProcedure<
      TInitialContext,
      MergedContext<TCurrentContext, U>,
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

  /**
   * Make this procedure callable (works like a function while still being a procedure).
   */
  callable<TClientContext>(
    ...rest: CreateProcedureClientRest<TInitialContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta, TClientContext>
  ): Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>
    & ProcedureClient < TClientContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap >

  /**
   * Make this procedure compatible with server action (the same as .callable, but the type is compatible with server action).
   */
  actionable<TClientContext>(
    ...rest: CreateProcedureClientRest<TInitialContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta, TClientContext>
  ): Procedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>
    & ((...rest: ClientRest<TClientContext, SchemaInput<TInputSchema>>) => Promise<SchemaOutput<TOutputSchema, THandlerOutput>>)
}

/**
 * Like `ProcedureBuilderWithoutHandler`, but removed all method that can change the contract.
 * It must backward compatible with `Builder`.
 */
export interface ProcedureImplementer<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'use'<U extends Context, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      U,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      UErrorMap,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ProcedureImplementer<
      TInitialContext,
      MergedContext<TCurrentContext, U>,
      TInputSchema,
      TOutputSchema,
      MergedErrorMap<UErrorMap, TErrorMap>,
      TMeta
    >

  'use'<UOutContext extends Context, UInput, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      SchemaInput<TOutputSchema>,
      UErrorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>>
    & ProcedureImplementer<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      MergedErrorMap<UErrorMap, TErrorMap>,
      TMeta
    >

  'handler'<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>,
  ): ImplementedProcedure<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    UFuncOutput,
    TErrorMap,
    TMeta
  >
}
