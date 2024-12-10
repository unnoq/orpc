import type { ContractProcedure, ContractRouter, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Lazy, Procedure, Router } from '@orpc/server'
import { createGeneralUtils, type GeneralUtils } from './utils-general'
import { createProcedureUtils, type ProcedureUtils } from './utils-procedure'

export type RouterUtils<T extends Router<any> | ContractRouter> = {
  [K in keyof T]: T[K] extends
  | ContractProcedure<infer UInputSchema, infer UOutputSchema>
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
    ?
    & ProcedureUtils<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
    & GeneralUtils<SchemaInput<UInputSchema>>
    : T[K] extends Router<any> | ContractRouter
      ? RouterUtils<T[K]>
      : never
} & GeneralUtils<unknown>

/**
 * @param client - The client create form `@orpc/client`
 * @param path - The base path for query key
 */
export function createRouterUtils<T extends Router<any> | ContractRouter>(
  client: any, // TODO typed
  path: string[] = [],
): RouterUtils<T> {
  const generalUtils = createGeneralUtils(path)
  const procedureUtils = createProcedureUtils(client, path)

  const recursive = new Proxy({
    ...generalUtils,
    ...procedureUtils,
  }, {
    get(target, prop) {
      const value = Reflect.get(target, prop)

      if (typeof prop !== 'string') {
        return value
      }

      const nextUtils = createRouterUtils(client[prop], [...path, prop])

      if (typeof value !== 'function') {
        return nextUtils
      }

      return new Proxy(value, {
        get(_, prop) {
          return Reflect.get(nextUtils, prop)
        },
      })
    },
  })

  return recursive as any
}
