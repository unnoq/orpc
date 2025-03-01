import type { ContractRouter, ErrorMap, HTTPPath, MergedErrorMap, Meta, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { BuilderDef } from './builder'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { FlattenLazy } from './lazy-utils'
import type { MapInputMiddleware, Middleware } from './middleware'
import type { ProcedureHandler } from './procedure'
import type { DecoratedProcedure } from './procedure-decorated'
import type { AdaptedRouter, AdaptRouterOptions, Router } from './router'

export interface BuilderWithMiddlewares<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): BuilderWithMiddlewares<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  'use'<UOutContext extends Context>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    BuilderWithMiddlewares<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'meta'(
    meta: TMeta,
  ): BuilderWithMiddlewares<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'input'<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta>

  'output'<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta>

  'handler'<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, unknown, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>

  'prefix'(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'tag'(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'router'<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    router: U
  ): AdaptedRouter<U, TInitialContext, TErrorMap>

  'lazy'<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap>
}

export interface ProcedureBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilder<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  'use'<UOutContext extends Context>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilder<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'input'<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta>

  'output'<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta>

  'handler'<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, unknown, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithInput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  'use'<UOutContext extends Context>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      SchemaOutput<TInputSchema>,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilderWithInput<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'use'<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilderWithInput<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'output'<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta>

  'handler'<UFuncOutput>(
    handler: ProcedureHandler<TCurrentContext, SchemaOutput<TInputSchema>, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilderWithOutput<
    TInitialContext,
    TCurrentContext,
    TInputSchema,
    TOutputSchema,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  'use'<UOutContext extends Context>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      unknown,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilderWithOutput<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'input'<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta>

  'handler'(
    handler: ProcedureHandler<TCurrentContext, unknown, SchemaInput<TOutputSchema>, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, unknown, TErrorMap, TMeta>
}

export interface ProcedureBuilderWithInputOutput<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta>

  'use'<UOutContext extends Context>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilderWithInputOutput<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'use'<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      SchemaInput<TOutputSchema>,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    ProcedureBuilderWithInputOutput<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      TErrorMap,
      TMeta
    >

  'meta'(
    meta: TMeta,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'route'(
    route: Route,
  ): ProcedureBuilderWithInputOutput<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  'handler'(
    handler: ProcedureHandler<TCurrentContext, SchemaOutput<TInputSchema>, SchemaInput<TOutputSchema>, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, unknown, TErrorMap, TMeta>
}

export interface RouterBuilder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': AdaptRouterOptions<TErrorMap>

  'errors'<U extends ErrorMap>(
    errors: U,
  ): RouterBuilder<TInitialContext, TCurrentContext, MergedErrorMap<TErrorMap, U>, TMeta>

  'use'<UOutContext extends Context>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      unknown,
      unknown,
      ORPCErrorConstructorMap<TErrorMap>,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    RouterBuilder<TInitialContext, MergedContext<TCurrentContext, UOutContext>, TErrorMap, TMeta>

  'prefix'(prefix: HTTPPath): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'tag'(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta>

  'router'<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    router: U
  ): AdaptedRouter<U, TInitialContext, TErrorMap>

  'lazy'<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap>
}
