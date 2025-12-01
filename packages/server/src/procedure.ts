import type { AnySchema, ContractProcedureDef, ErrorMap, Meta } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware } from './middleware'
import { isContractProcedure } from '@orpc/contract'

export interface ProcedureHandlerOptions<
  TCurrentContext extends Context,
  TInput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
> {
  context: TCurrentContext
  input: TInput
  path: readonly string[]
  procedure: Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, TMeta>
  signal?: AbortSignal
  lastEventId: string | undefined
  errors: TErrorConstructorMap
}

export interface ProcedureHandler<
  TCurrentContext extends Context,
  TInput,
  THandlerOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  (
    opt: ProcedureHandlerOptions<TCurrentContext, TInput, ORPCErrorConstructorMap<TErrorMap>, TMeta>
  ): Promisable<THandlerOutput>
}

export interface ProcedureDef<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  __initialContext?: (type: TInitialContext) => unknown
  middlewares: readonly AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
  handler: ProcedureHandler<TCurrentContext, any, any, any, any>
}

/**
 * This class represents a procedure.
 *
 * @see {@link https://orpc.dev/docs/procedure Procedure Docs}
 */
export class Procedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  /**
   * This property holds the defined options.
   */
  '~orpc': ProcedureDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: ProcedureDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }
}

export type AnyProcedure = Procedure<any, any, any, any, any, any>

export function isProcedure(item: unknown): item is AnyProcedure {
  if (item instanceof Procedure) {
    return true
  }

  return (
    isContractProcedure(item)
    && 'middlewares' in item['~orpc']
    && 'inputValidationIndex' in item['~orpc']
    && 'outputValidationIndex' in item['~orpc']
    && 'handler' in item['~orpc']
  )
}
