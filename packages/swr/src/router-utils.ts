import type { AnyNestedClient, Client } from '@orpc/client'
import type { Public } from '@orpc/shared'
import type { OperationKeyPrefixOptions } from './key'
import { RECURSIVE_CLIENT_UNWRAP_KEYS } from '@orpc/client'
import { bindMethods, get, getOrBind, isTypescriptObject, toArray } from '@orpc/shared'
import { ProcedureUtils } from './procedure-utils'
import { SharedUtils } from './shared-utils'

export type RouterUtils<T extends AnyNestedClient>
  = T extends Client<infer UClientContext, infer UInput, infer UOutput, infer UError>
    ? Public<ProcedureUtils<UClientContext, UInput, UOutput, UError>>
    : {
      [K in keyof T]: T[K] extends AnyNestedClient ? RouterUtils<T[K]> : never
    } & Public<SharedUtils<unknown>>

export interface RouterUtilsOptions extends OperationKeyPrefixOptions {
  /**
   * Base path for all keys.
   *
   * @internal
   */
  path?: string[] | undefined
}

/**
 * Create a swr router utils from a client.
 *
 * @info Both client-side and server-side clients are supported.
 * @see {@link https://orpc.dev/docs/integrations/swr SWR Integration}
 */
export function createRouterUtils<T extends AnyNestedClient>(
  client: T,
  options: RouterUtilsOptions = {},
): RouterUtils<T> {
  const path = toArray(options.path)

  const utils = typeof client === 'function'
    ? bindMethods(new ProcedureUtils(path, client as any, { prefix: options.prefix }))
    : bindMethods(new SharedUtils(path, { prefix: options.prefix }))

  const recursive = new Proxy(utils, {
    get(target, prop) {
      const value = getOrBind(target, prop)
      const nextClient = get(client, [prop])

      if (typeof prop !== 'string' || RECURSIVE_CLIENT_UNWRAP_KEYS.has(prop) || !isTypescriptObject(nextClient)) {
        return value
      }

      const nextUtils = createRouterUtils(nextClient as any, { ...options, path: [...path, prop] })

      if (typeof value !== 'function') {
        return nextUtils
      }

      return new Proxy(value, {
        get(target, prop) {
          if (typeof prop !== 'string' || RECURSIVE_CLIENT_UNWRAP_KEYS.has(prop)) {
            return getOrBind(target, prop)
          }

          return getOrBind(nextUtils, prop)
        },
      })
    },
  })

  return recursive as any
}
