import type { HTTPPath, RouteOptions, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ANY_MIDDLEWARE, MapInputMiddleware, Middleware } from './middleware'
import type { Caller, Context, MergeContext } from './types'
import { DecoratedContractProcedure } from '@orpc/contract'
import { decorateMiddleware } from './middleware-decorated'
import { Procedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'

export type DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaInput<TOutputSchema>,
> =
  & Procedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>
  & {
    prefix: (
      prefix: HTTPPath,
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    route: (
      route: RouteOptions,
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    use:
    & (
      <U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
        middleware: Middleware<
          MergeContext<TContext, TExtraContext>,
          U,
          SchemaOutput<TInputSchema>,
          SchemaInput<TOutputSchema, TFuncOutput>
        >,
      ) => DecoratedProcedure<
        TContext,
        MergeContext<TExtraContext, U>,
        TInputSchema,
        TOutputSchema,
        TFuncOutput
      >
    )
    & (
      <
        UExtra extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
        UInput = unknown,
      >(
        middleware: Middleware<
          MergeContext<TContext, TExtraContext>,
          UExtra,
          UInput,
          SchemaInput<TOutputSchema, TFuncOutput>
        >,
        mapInput: MapInputMiddleware<
          SchemaOutput<TInputSchema, TFuncOutput>,
          UInput
        >,
      ) => DecoratedProcedure<
        TContext,
        MergeContext<TExtraContext, UExtra>,
        TInputSchema,
        TOutputSchema,
        TFuncOutput
      >
    )

    unshiftTag: (...tags: string[]) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

    unshiftMiddleware: <U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
      ...middlewares: Middleware<TContext, U, SchemaOutput<TInputSchema>, SchemaInput<TOutputSchema, TFuncOutput>>[]
    ) => DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

  }
  & (undefined extends TContext ? Caller<SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema, TFuncOutput>> : unknown)

export function decorateProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaInput<TOutputSchema>,
>(
  procedure: Procedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >,
): DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput > {
  const caller = createProcedureCaller({
    procedure: procedure as any,
    context: undefined as any,
  })

  const decorated = caller as DecoratedProcedure<TContext, TExtraContext, TInputSchema, TOutputSchema, TFuncOutput>

  decorated['~type'] = procedure['~type']
  decorated['~orpc'] = procedure['~orpc']

  decorated.prefix = (prefix) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).prefix(prefix),
    }))
  }

  decorated.route = (route) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).route(route),
    }))
  }

  decorated.use = (middleware: Middleware<any, any, any, any>, mapInput?: MapInputMiddleware<any, any>) => {
    const middleware_ = mapInput
      ? decorateMiddleware(middleware).mapInput(mapInput)
      : middleware

    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      middlewares: [...(procedure['~orpc'].middlewares ?? []), middleware_],
    })) as any
  }

  decorated.unshiftTag = (...tags) => {
    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      contract: DecoratedContractProcedure.decorate(procedure['~orpc'].contract).unshiftTag(...tags),
    }))
  }

  decorated.unshiftMiddleware = (...middlewares: ANY_MIDDLEWARE[]) => {
    if (procedure['~orpc'].middlewares?.length) {
      let min = 0

      for (let i = 0; i < procedure['~orpc'].middlewares.length; i++) {
        const index = middlewares.indexOf(procedure['~orpc'].middlewares[i]!, min)

        if (index === -1) {
          middlewares.push(...procedure['~orpc'].middlewares.slice(i))
          break
        }

        min = index + 1
      }
    }

    return decorateProcedure(new Procedure({
      ...procedure['~orpc'],
      middlewares,
    }))
  }

  return decorated
}
