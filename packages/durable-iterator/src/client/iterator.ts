import type { Client, ClientLink, NestedClient, ThrowableError } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { AsyncIteratorClass } from '@orpc/shared'
import type { DurableIteratorObject, InferDurableIteratorObjectRPC } from '../object'
import { createORPCClient } from '@orpc/client'
import { isAsyncIteratorObject } from '@orpc/shared'
import { parseDurableIteratorToken } from '../schemas'

const CLIENT_DURABLE_ITERATOR_TOKEN_SYMBOL = Symbol('ORPC_CLIENT_DURABLE_ITERATOR_TOKEN')

export interface ClientDurableIteratorRpcContext extends ClientRetryPluginContext {
}

export type ClientDurableIteratorRpc<T extends NestedClient<object>>
  = T extends Client<any, infer UInput, infer UOutput, any>
    ? Client<ClientDurableIteratorRpcContext, UInput, UOutput, ThrowableError>
    : {
        [K in keyof T]: T[K] extends NestedClient<object>
          ? ClientDurableIteratorRpc<T[K]>
          : never
      }

export type ClientDurableIterator<
  T extends DurableIteratorObject<any>,
  RPC extends InferDurableIteratorObjectRPC<T>,
> = AsyncIteratorClass<T extends DurableIteratorObject<infer TPayload> ? TPayload : never> & {
  [K in RPC]: T[K] extends (...args: any[]) => (infer R extends NestedClient<object>)
    ? ClientDurableIteratorRpc<R>
    : never
}

export interface CreateClientDurableIteratorOptions {
  /**
   * The token used to authenticate the client.
   * this is a function because the token is lazy, and dynamic-able
   */
  getToken: () => string
}

export function createClientDurableIterator<
  T extends DurableIteratorObject<any>,
  RPC extends InferDurableIteratorObjectRPC<T>,
>(
  iterator: AsyncIteratorClass<T>,
  link: ClientLink<object>,
  options: CreateClientDurableIteratorOptions,
): ClientDurableIterator<T, RPC> {
  const proxy = new Proxy(iterator, {
    get(target, prop) {
      const token = options.getToken()
      const { rpc: allowMethods } = parseDurableIteratorToken(token)

      if (prop === CLIENT_DURABLE_ITERATOR_TOKEN_SYMBOL) {
        return token
      }

      if (typeof prop === 'string' && allowMethods?.includes(prop)) {
        return createORPCClient(link, { path: [prop] })
      }

      const v = Reflect.get(target, prop)
      return typeof v === 'function'
        ? v.bind(target) // Require .bind itself for calling
        : v
    },
  })

  return proxy as any
}

/**
 * If return a token if the client is a Client Durable Event Iterator.
 */
export function getClientDurableIteratorToken(
  client: unknown,
): string | undefined {
  if (isAsyncIteratorObject(client)) {
    return Reflect.get(client, CLIENT_DURABLE_ITERATOR_TOKEN_SYMBOL) as string | undefined
  }
}
