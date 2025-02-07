import type { Client, NestedClient } from '@orpc/contract'
import { createGeneralUtils, type GeneralUtils } from './general-utils'
import { createProcedureUtils, type ProcedureUtils } from './procedure-utils'

export type RouterUtils<T extends NestedClient<any>> =
  T extends Client<infer UClientContext, infer UInput, infer UOutput, infer UError>
    ? ProcedureUtils<UClientContext, UInput, UOutput, UError> & GeneralUtils<UInput>
    : {
      [K in keyof T]: T[K] extends NestedClient<any> ? RouterUtils<T[K]> : never
    } & GeneralUtils<unknown>

/**
 * @param client - Any kind of oRPC clients: `createRouterClient`, `createORPCClient`, ...
 * @param path - The base path for query key, when it it will be prefix to all keys
 */
export function createRouterUtils<T extends NestedClient<any>>(
  client: T,
  path: string[] = [],
): RouterUtils<T> {
  const generalUtils = createGeneralUtils(path)
  const procedureUtils = createProcedureUtils(client as any, path)

  const recursive = new Proxy({
    ...generalUtils,
    ...procedureUtils,
  }, {
    get(target, prop) {
      const value = Reflect.get(target, prop)

      if (typeof prop !== 'string') {
        return value
      }

      const nextUtils = createRouterUtils((client as any)[prop], [...path, prop])

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
