import type { DurableIteratorWebsocket } from './websocket'
import { toDurableIteratorWebsocket } from './websocket'

export interface DurableIteratorObjectStateInternal {
  /**
   * The original DurableObjectState
   *
   * @warning Be careful when using original because you can accidentally modifying internal state.
   */
  original: DurableObjectState
}

export interface DurableIteratorObjectState extends DurableObjectState {
  /**
   * DurableIteratorObjectState internal apis
   */
  '~orpc': DurableIteratorObjectStateInternal

  /**
   * Get all WebSockets connected to this Durable Object
   * And convert them to DurableIteratorWebsocket to avoid accidentally modifying internal state
   */
  'getWebSockets'(...args: Parameters<DurableObjectState['getWebSockets']>): DurableIteratorWebsocket[]
}

export function toDurableIteratorObjectState(original: DurableObjectState): DurableIteratorObjectState {
  if ('~orpc' in original) {
    return original as DurableIteratorObjectState
  }

  const internal: DurableIteratorObjectStateInternal = {
    original,
  }

  const getWebSockets: DurableObjectState['getWebSockets'] = (...args) => {
    return original.getWebSockets(...args).map(ws => toDurableIteratorWebsocket(ws))
  }

  const proxy = new Proxy(original, {
    get(_, prop) {
      if (prop === '~orpc') {
        return internal
      }

      if (prop === 'getWebSockets') {
        return getWebSockets
      }

      const v = Reflect.get(original, prop)
      return typeof v === 'function'
        ? v.bind(original) // Require .bind itself for calling
        : v
    },
    has(_, p) {
      return p === '~orpc' || Reflect.has(original, p)
    },
  })

  return proxy as any
}
