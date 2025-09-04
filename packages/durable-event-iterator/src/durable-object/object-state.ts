import type { DurableEventIteratorWebsocket } from './websocket'
import { toDurableEventIteratorWebsocket } from './websocket'

export interface DurableEventIteratorObjectState extends DurableObjectState {
  getWebSockets(...args: Parameters<DurableObjectState['getWebSockets']>): DurableEventIteratorWebsocket[]
}

export function createDurableEventIteratorObjectState(ctx: DurableObjectState): DurableEventIteratorObjectState {
  const proxy = new Proxy(ctx, {
    get(target, prop, receiver) {
      if (prop === 'getWebSockets') {
        const getWebSockets: DurableObjectState['getWebSockets'] = (...args) => {
          return ctx.getWebSockets(...args).map(ws => toDurableEventIteratorWebsocket(ws))
        }
        return getWebSockets
      }

      const value = Reflect.get(target, prop, receiver)

      if (typeof value === 'function') {
        return value.bind(target)
      }

      return value
    },
  })

  return proxy as any
}
