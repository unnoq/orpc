import type { Promisable } from '@orpc/shared'
import type { Lazy } from './lazy'
import type { ProcedureCaller } from './procedure-caller'
import type { Context, MergeContext, Meta } from './types'
import {
  type ContractProcedure,
  DecoratedContractProcedure,
  type HTTPPath,
  isContractProcedure,
  type RouteOptions,
  type Schema,
  type SchemaInput,
  type SchemaOutput,
} from '@orpc/contract'
import {
  decorateMiddleware,
  type MapInputMiddleware,
  type Middleware,
} from './middleware'
import { createProcedureCaller } from './procedure-caller'

export class Procedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> {
  constructor(
    public zz$p: {
      middlewares?: Middleware<any, any, any, any>[]
      contract: ContractProcedure<TInputSchema, TOutputSchema>
      func: ProcedureFunc<
        TContext,
        TExtraContext,
        TInputSchema,
        TOutputSchema,
        TFuncOutput
      >
    },
  ) {}
}

export type ANY_PROCEDURE = Procedure<any, any, any, any, any>
export type WELL_DEFINED_PROCEDURE = Procedure<Context, Context, Schema, Schema, unknown>
export type ANY_LAZY_PROCEDURE = Lazy<ANY_PROCEDURE>

export type DecoratedProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
> = Procedure<
  TContext,
  TExtraContext,
  TInputSchema,
  TOutputSchema,
  TFuncOutput
> & {
  prefix: (
    prefix: HTTPPath,
  ) => DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >

  route: (
    opts: RouteOptions,
  ) => DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >

  use: (<
    UExtraContext extends
    | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
    | undefined = undefined,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      SchemaOutput<TInputSchema>,
      SchemaInput<TOutputSchema, TFuncOutput>
    >,
  ) => DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >) & (<
    UExtraContext extends
    | Partial<MergeContext<Context, MergeContext<TContext, TExtraContext>>>
    | undefined = undefined,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      SchemaInput<TOutputSchema, TFuncOutput>
    >,
    mapInput: MapInputMiddleware<
      SchemaOutput<TInputSchema, TFuncOutput>,
      UMappedInput
    >,
  ) => DecoratedProcedure<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >)
} & (undefined extends TContext
  ? ProcedureCaller<Procedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >>
  : unknown)

export interface ProcedureFunc<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TOutput extends SchemaOutput<TOutputSchema>,
> {
  (
    input: SchemaOutput<TInputSchema>,
    context: MergeContext<TContext, TExtraContext>,
    meta: Meta,
  ): Promisable<SchemaInput<TOutputSchema, TOutput>>
}

const DECORATED_PROCEDURE_SYMBOL = Symbol('DECORATED_PROCEDURE')

export function decorateProcedure<
  TContext extends Context,
  TExtraContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaOutput<TOutputSchema>,
>(
  procedure: Procedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  >,
): DecoratedProcedure<
    TContext,
    TExtraContext,
    TInputSchema,
    TOutputSchema,
    TFuncOutput
  > {
  if (DECORATED_PROCEDURE_SYMBOL in procedure) {
    return procedure as any
  }

  return Object.assign(createProcedureCaller({
    procedure: procedure as any,
    context: undefined as any,
  }), {
    [DECORATED_PROCEDURE_SYMBOL]: true,
    zz$p: procedure.zz$p,

    prefix(prefix: HTTPPath) {
      return decorateProcedure({
        zz$p: {
          ...procedure.zz$p,
          contract: DecoratedContractProcedure.decorate(
            procedure.zz$p.contract,
          ).prefix(prefix),
        },
      })
    },

    route(opts: RouteOptions) {
      return decorateProcedure({
        zz$p: {
          ...procedure.zz$p,
          contract: DecoratedContractProcedure.decorate(
            procedure.zz$p.contract,
          ).route(opts),
        },
      })
    },

    use(
      middleware: Middleware<any, any, any, any>,
      mapInput?: MapInputMiddleware<any, any>,
    ) {
      const middleware_ = mapInput
        ? decorateMiddleware(middleware).mapInput(mapInput)
        : middleware

      return decorateProcedure({
        zz$p: {
          ...procedure.zz$p,
          middlewares: [middleware_, ...(procedure.zz$p.middlewares ?? [])],
        },
      })
    },
  }) as any
}

export function isProcedure(item: unknown): item is ANY_PROCEDURE {
  if (item instanceof Procedure)
    return true

  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && 'zz$p' in item
    && typeof item.zz$p === 'object'
    && item.zz$p !== null
    && 'contract' in item.zz$p
    && isContractProcedure(item.zz$p.contract)
    && 'func' in item.zz$p
    && typeof item.zz$p.func === 'function'
  )
}
