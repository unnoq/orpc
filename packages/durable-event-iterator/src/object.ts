import type { JsonValue } from '@orpc/shared'

export const DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL: unique symbol = Symbol('ORPC_DURABLE_EVENT_ITERATOR_OBJECT')

export type JwtAttachment = JsonValue | undefined

export interface DurableEventIteratorObject<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment,
> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    jwtAttachment: TJwtAttachment
  }
}
