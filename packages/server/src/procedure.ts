import type { ContractProcedureDef, ErrorMap, Meta, Schema } from '@orpc/contract'
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
  path: string[]
  procedure: Procedure<Context, Context, Schema, Schema, unknown, ErrorMap, TMeta>
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
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta> {
  __initialContext?: (type: TInitialContext) => unknown
  middlewares: AnyMiddleware[]
  inputValidationIndex: number
  outputValidationIndex: number
  handler: ProcedureHandler<TCurrentContext, any, THandlerOutput, any, any>
}

export class Procedure<
  TInitialContext extends Context,
  TCurrentContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  '~orpc': ProcedureDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>

  constructor(def: ProcedureDef<TInitialContext, TCurrentContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>) {
    this['~orpc'] = def
  }
}

export type AnyProcedure = Procedure<any, any, any, any, any, any, any>

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
