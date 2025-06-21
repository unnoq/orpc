import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type { JwtAttachment } from '../object'
import type { DurableEventIteratorJwtPayload } from '../schemas'
import type { DurableEventIteratorObjectEventStorage } from './event-storage'
import { experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent } from '@orpc/server/hibernation'
import { DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY, DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from './consts'

export interface DurableEventIteratorObjectWebsocketManagerOptions<TEventPayload extends object> extends StandardRPCJsonSerializerOptions {
  eventStorage: DurableEventIteratorObjectEventStorage<TEventPayload>
}

export type DurableEventIteratorObjectWebsocketInternalAttachment<
  TJwtAttachment,
> = {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]?: number

  /**
   * The payload of the JWT used to authenticate the WebSocket connection.
   */
  [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: Omit<DurableEventIteratorJwtPayload, 'att'> & {
    att: TJwtAttachment
  }
}

export type DurableEventIteratorObjectWebsocketAttachment
  = Record<string | number, unknown>
    & Record<keyof DurableEventIteratorObjectWebsocketInternalAttachment<any>, never>

export class DurableEventIteratorObjectWebsocketManager<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment,
> {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly options: DurableEventIteratorObjectWebsocketManagerOptions<TEventPayload>,
  ) {}

  publishEvent(wss: readonly WebSocket[], payload: TEventPayload): void {
    payload = this.options.eventStorage.storeEvent(payload)

    for (const ws of wss) {
      const attachment = this.deserializeAttachment(ws)
      const hibernationEventIteratorId = attachment?.[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]

      if (hibernationEventIteratorId === undefined) {
        // Maybe the connection not finished the subscription process yet
        continue
      }

      ws.send(encodeHibernationRPCEvent(hibernationEventIteratorId, payload, this.options))
    }
  }

  sendMissingEvents(
    ws: WebSocket,
    hibernationId: number,
    lastEventId: string,
  ): void {
    const events = this.options.eventStorage.getEventsAfter(lastEventId)

    for (const event of events) {
      ws.send(encodeHibernationRPCEvent(hibernationId, event, this.options))
    }
  }

  serializeAttachment(ws: WebSocket, attachment: TWsAttachment): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...attachment,
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: old[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY],
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: old[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY],
    })
  }

  serializeInternalAttachment(ws: WebSocket, attachment: Partial<DurableEventIteratorObjectWebsocketInternalAttachment<TJwtAttachment>>): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...old,
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: attachment[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY],
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: attachment[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY],
    })
  }

  deserializeAttachment(ws: WebSocket): DurableEventIteratorObjectWebsocketInternalAttachment<TJwtAttachment> & Omit<TWsAttachment, keyof DurableEventIteratorObjectWebsocketInternalAttachment<TJwtAttachment>> {
    return ws.deserializeAttachment()
  }
}
