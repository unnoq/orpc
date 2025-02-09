import type { ContractProcedureDef, ContractRouter, ErrorMap, HTTPPath, MergedErrorMap, Meta, Route, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { BuilderWithMiddlewares, ProcedureBuilder, ProcedureBuilderWithInput, ProcedureBuilderWithOutput, RouterBuilder } from './builder-variants'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { FlattenLazy } from './lazy-utils'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { ProcedureHandler } from './procedure'
import type { AdaptedRouter, AdaptRouterOptions, Router } from './router'
import { mergeErrorMap, mergeMeta, mergePrefix, mergeRoute, mergeTags } from '@orpc/contract'
import { fallbackConfig } from './config'
import { lazy } from './lazy'
import { flatLazy } from './lazy-utils'
import { decorateMiddleware } from './middleware-decorated'
import { addMiddleware } from './middleware-utils'
import { DecoratedProcedure } from './procedure-decorated'
import { adaptRouter } from './router'

export interface BuilderConfig {
  initialInputValidationIndex?: number
  initialOutputValidationIndex?: number
}

export interface BuilderDef<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>, AdaptRouterOptions< TErrorMap> {
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
  config: BuilderConfig
}

export class Builder<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: BuilderDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }

  /**
   * Reset config
   */
  $config(config: BuilderConfig): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    const inputValidationCount = this['~orpc'].inputValidationIndex - fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex)
    const outputValidationCount = this['~orpc'].outputValidationIndex - fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex)

    return new Builder({
      ...this['~orpc'],
      config,
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', config.initialInputValidationIndex) + inputValidationCount,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', config.initialOutputValidationIndex) + outputValidationCount,
    })
  }

  /**
   * Reset initial context
   */
  $context<U extends Context>(): Builder<U, U, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      middlewares: [],
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex),
    })
  }

  /**
   * Reset initial meta
   */
  $meta<U extends Meta>(
    initialMeta: U,
  ): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, U> {
    return new Builder({
      ...this['~orpc'],
      meta: initialMeta,
    })
  }

  /**
   * Reset initial route
   */
  $route(
    initialRoute: Route,
  ): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      route: initialRoute,
    })
  }

  middleware<UOutContext extends Context, TInput, TOutput = any>( // = any here is important to make middleware can be used in any output by default
    middleware: Middleware<TCurrentContext, UOutContext, TInput, TOutput, TErrorMap, TMeta>,
  ): DecoratedMiddleware<TCurrentContext, UOutContext, TInput, TOutput, TErrorMap, TMeta> {
    middleware['~errorMap'] = this['~orpc'].errorMap

    return decorateMiddleware(middleware)
  }

  errors<U extends ErrorMap>(
    errors: U,
  ): Builder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, MergedErrorMap<TErrorMap, U>, TMeta > {
    return new Builder({
      ...this['~orpc'],
      errorMap: mergeErrorMap(this['~orpc'].errorMap, errors),
    })
  }

  use<UOutContext extends Context, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema>,
      UErrorMap,
      TMeta
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    BuilderWithMiddlewares<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      MergedErrorMap<UErrorMap, TErrorMap>,
      TMeta
    >

  use<UOutContext extends Context, UInput, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TCurrentContext,
      UOutContext,
      UInput,
      SchemaInput<TOutputSchema>,
      UErrorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<SchemaOutput<TInputSchema>, UInput>,
  ): ConflictContextGuard<MergedContext<TCurrentContext, UOutContext>> &
    BuilderWithMiddlewares<
      TInitialContext,
      MergedContext<TCurrentContext, UOutContext>,
      TInputSchema,
      TOutputSchema,
      MergedErrorMap<UErrorMap, TErrorMap>,
      TMeta
    >

  use(
    middleware: AnyMiddleware,
    mapInput?: MapInputMiddleware<any, any>,
  ): any {
    const mapped = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return new Builder({
      ...this['~orpc'],
      errorMap: mapped['~errorMap']
        ? mergeErrorMap(mapped['~errorMap'], this['~orpc'].errorMap)
        : this['~orpc'].errorMap,
      middlewares: addMiddleware(this['~orpc'].middlewares, mapped),
    })
  }

  meta(
    meta: TMeta,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      meta: mergeMeta(this['~orpc'].meta, meta),
    })
  }

  route(
    route: Route,
  ): ProcedureBuilder<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      route: mergeRoute(this['~orpc'].route, route),
    })
  }

  input<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithInput<TInitialContext, TCurrentContext, USchema, TOutputSchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      inputSchema: schema,
      inputValidationIndex: fallbackConfig('initialInputValidationIndex', this['~orpc'].config.initialInputValidationIndex) + this['~orpc'].middlewares.length,
    }) as any // Type instantiation is excessively deep and possibly infinite.
  }

  output<USchema extends Schema>(
    schema: USchema,
  ): ProcedureBuilderWithOutput<TInitialContext, TCurrentContext, TInputSchema, USchema, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      outputSchema: schema,
      outputValidationIndex: fallbackConfig('initialOutputValidationIndex', this['~orpc'].config.initialOutputValidationIndex) + this['~orpc'].middlewares.length,
    })
  }

  handler<UFuncOutput extends SchemaInput<TOutputSchema>>(
    handler: ProcedureHandler<TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta>,
  ): DecoratedProcedure<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, UFuncOutput, TErrorMap, TMeta> {
    return new DecoratedProcedure({
      ...this['~orpc'],
      handler,
    })
  }

  prefix(
    prefix: HTTPPath,
  ): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      prefix: mergePrefix(this['~orpc'].prefix, prefix),
    }) as any
  }

  tag(...tags: string[]): RouterBuilder<TInitialContext, TCurrentContext, TErrorMap, TMeta> {
    return new Builder({
      ...this['~orpc'],
      tags: mergeTags(this['~orpc'].tags, tags),
    }) as any
  }

  router<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(router: U): AdaptedRouter<U, TInitialContext, TErrorMap> {
    return adaptRouter(router, this['~orpc'])
  }

  lazy<U extends Router<TCurrentContext, ContractRouter<TMeta>>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, TErrorMap> {
    return adaptRouter(flatLazy(lazy(loader)), this['~orpc'])
  }
}

export const os = new Builder({
  config: {},
  route: {},
  meta: {},
  errorMap: {},
  inputSchema: undefined,
  outputSchema: undefined,
  inputValidationIndex: fallbackConfig('initialInputValidationIndex'),
  outputValidationIndex: fallbackConfig('initialOutputValidationIndex'),
  middlewares: [],
})
