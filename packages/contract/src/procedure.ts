import type { ErrorMap } from './error'
import type { Meta } from './meta'
import type { Route } from './route'
import type { AnySchema } from './schema'
import { isORPCErrorStatus } from '@orpc/client'

export interface ContractProcedureDef<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  meta: TMeta
  route: Route
  inputSchema?: TInputSchema
  outputSchema?: TOutputSchema
  errorMap: TErrorMap
}

/**
 * This class represents a contract procedure.
 *
 * @see {@link https://orpc.dev/docs/contract-first/define-contract#procedure-contract Contract Procedure Docs}
 */
export class ContractProcedure<
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> {
  /**
   * This property holds the defined options for the contract procedure.
   */
  '~orpc': ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>

  constructor(def: ContractProcedureDef<TInputSchema, TOutputSchema, TErrorMap, TMeta>) {
    if (def.route?.successStatus && isORPCErrorStatus(def.route.successStatus)) {
      throw new Error('[ContractProcedure] Invalid successStatus.')
    }

    if (Object.values(def.errorMap).some(val => val && val.status && !isORPCErrorStatus(val.status))) {
      throw new Error('[ContractProcedure] Invalid error status code.')
    }

    this['~orpc'] = def
  }
}

export type AnyContractProcedure = ContractProcedure<any, any, any, any>

export function isContractProcedure(item: unknown): item is AnyContractProcedure {
  if (item instanceof ContractProcedure) {
    return true
  }

  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && '~orpc' in item
    && typeof item['~orpc'] === 'object'
    && item['~orpc'] !== null
    && 'errorMap' in item['~orpc']
    && 'route' in item['~orpc']
    && 'meta' in item['~orpc']
  )
}
