import type { ThrowableError } from '@orpc/shared'
import type { ORPCErrorFromErrorMap } from './error'
import type { AnyProcedureContract, ProcedureContract } from './procedure'
import type { InferSchemaInput, InferSchemaOutput } from './schema'

/**
 * A router contract: a single procedure contract or a nested record of them.
 *
 * @see {@link https://orpc.dev/docs/advanced/scaling-large-projects | Scaling Large Projects}
 */
export type RouterContract
  = | AnyProcedureContract
    | {
      [k: string]: RouterContract
    }

/**
 * Infer the input types for each procedure-contract, preserving the router-contract shape.
 *
 * @see {@link https://orpc.dev/docs/contract/router#infer-router-contract-inputs | Router Contract}
 */
export type InferRouterContractInputs<T extends RouterContract>
  = T extends ProcedureContract<infer UInputSchema, any, any>
    ? InferSchemaInput<UInputSchema>
    : {
        [K in keyof T]: T[K] extends RouterContract ? InferRouterContractInputs<T[K]> : never
      }

/**
 * Infer the output types for each procedure-contract, preserving the router-contract shape.
 *
 * @see {@link https://orpc.dev/docs/contract/router#infer-router-contract-outputs | Router Contract}
 */
export type InferRouterContractOutputs<T extends RouterContract>
  = T extends ProcedureContract<any, infer UOutputSchema, any>
    ? InferSchemaOutput<UOutputSchema>
    : {
        [K in keyof T]: T[K] extends RouterContract ? InferRouterContractOutputs<T[K]> : never
      }

/**
 * Infer the union of error maps defined across the entire router-contract.
 *
 * @see {@link https://orpc.dev/docs/contract/router#infer-router-contract-error-map | Router Contract}
 */
export type InferRouterContractErrorMap<T extends RouterContract>
  = T extends ProcedureContract<any, any, infer UErrorMap>
    ? UErrorMap
    : {
        [K in keyof T]: T[K] extends RouterContract ? InferRouterContractErrorMap<T[K]> : never
      }[keyof T]

/**
 * Infer the union of throwable errors for entire router-contract.
 *
 * @see {@link https://orpc.dev/docs/contract/router#infer-router-contract-error | Router Contract}
 */
export type InferRouterContractError<T extends RouterContract>
  = T extends ProcedureContract<any, any, infer UErrorMap>
    ? ORPCErrorFromErrorMap<UErrorMap> | ThrowableError
    : {
        [K in keyof T]: T[K] extends RouterContract ? InferRouterContractError<T[K]> : never
      }[keyof T]

/**
 * Infer throwable errors for each procedure-contract, preserving the router-contract shape.
 *
 * @see {@link https://orpc.dev/docs/contract/router#infer-router-contract-errors | Router Contract}
 */
export type InferRouterContractErrors<T extends RouterContract>
  = T extends ProcedureContract<any, any, infer UErrorMap>
    ? ORPCErrorFromErrorMap<UErrorMap> | ThrowableError
    : {
        [K in keyof T]: T[K] extends RouterContract ? InferRouterContractErrors<T[K]> : never
      }
