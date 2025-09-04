import type { TokenPayload } from '../schemas'

export interface DurableEventIteratorWebsocketInternal {
  /**
   * Access the original websocket instance
   *
   * @warning Be careful when using original because it can break the Durable Event Iterator functionality
   */
  original: WebSocket

  /**
   * Serialize the hibernation id used for publishing events to the client
   */
  serializeHibernationId(id: string): void

  /**
   * Deserialize the hibernation id used for publishing events to the client
   */
  deserializeHibernationId(): string | undefined

  /**
   * Serialize the token payload usually when client connected
   *
   * @warning this method should be called only once when client connected
   */
  serializeTokenPayload(payload: TokenPayload): void

  /**
   * Deserialize the payload attached when client connected
   *
   * @warning this method assumes that the payload is already set when client connected
   */
  deserializeTokenPayload(): TokenPayload
}

export interface DurableEventIteratorWebsocket extends WebSocket {
  /**
   * Durable Event Iterator internal apis
   */
  ['~orpc']: DurableEventIteratorWebsocketInternal
}

/**
 * Create a Durable Event Iterator WebSocket from a regular WebSocket
 */
export function toDurableEventIteratorWebsocket(original: WebSocket): DurableEventIteratorWebsocket {
  if ('~orpc' in original) {
    return original as DurableEventIteratorWebsocket
  }

  const proxy = new Proxy(original, {
    get(target, prop, receiver) {
      if (prop === '~orpc') {
        return {
          original: target,
          serializeHibernationId(id) {
            target.serializeAttachment({
              ...target.deserializeAttachment(),
              hibernationId: id,
            })
          },
          deserializeHibernationId() {
            return target.deserializeAttachment()?.hibernationId
          },
          serializeTokenPayload(payload) {
            target.serializeAttachment({
              ...target.deserializeAttachment(),
              tokenPayload: payload,
            })
          },
          deserializeTokenPayload() {
            const payload = target.deserializeAttachment()?.tokenPayload

            if (!payload) {
              throw new Error('[DurableEventIteratorWebsocket] Token payload not found, please call serialieTokenPayload first')
            }

            return payload
          },
        } satisfies DurableEventIteratorWebsocketInternal
      }

      if (prop === 'serializeAttachment') {
        const serializeAttachment: WebSocket['serializeAttachment'] = (attachment) => {
          target.serializeAttachment({
            ...target.deserializeAttachment(),
            attachment,
          })
        }

        return serializeAttachment
      }

      if (prop === 'deserializeAttachment') {
        const deserializeAttachment: WebSocket['deserializeAttachment'] = () => {
          return target.deserializeAttachment()?.attachment
        }

        return deserializeAttachment
      }

      const value = Reflect.get(target, prop, receiver)

      if (typeof value === 'function') {
        return value.bind(target)
      }

      return value
    },
    has(target, p) {
      return p === '~orpc' || Reflect.has(target, p)
    },
  })

  return proxy as any
}
