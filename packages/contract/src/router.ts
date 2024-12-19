import type { ANY_CONTRACT_PROCEDURE, ContractProcedure } from './procedure'
import type { SchemaInput, SchemaOutput } from './types'

export type ContractRouter = ANY_CONTRACT_PROCEDURE | {
  [k: string]: ContractRouter
}

export type InferContractRouterInputs<T extends ContractRouter> =
  T extends ContractProcedure<infer UInputSchema, any>
    ? SchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends ContractRouter ? InferContractRouterInputs<T[K]> : never
      }

export type InferContractRouterOutputs<T extends ContractRouter> =
  T extends ContractProcedure<any, infer UOutputSchema>
    ? SchemaOutput<UOutputSchema>
    : {
        [K in keyof T]: T[K] extends ContractRouter ? InferContractRouterOutputs<T[K]> : never
      }
