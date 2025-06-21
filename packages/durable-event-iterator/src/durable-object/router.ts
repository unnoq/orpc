import type { Client } from '@orpc/client'
import type { DurableObject } from 'cloudflare:workers'
import type { JwtAttachment } from '../object'
import type { DurableEventIteratorObjectWebsocketAttachment, DurableEventIteratorObjectWebsocketManager } from './websocket-manager'
import { implement, ORPCError } from '@orpc/server'
import { experimental_HibernationEventIterator as HibernationEventIterator } from '@orpc/server/hibernation'
import { get } from '@orpc/shared'
import { durableEventIteratorContract } from '../client/contract'
import { DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY } from './consts'

const os = implement(durableEventIteratorContract)

export interface DurableEventIteratorObjectRouterContext<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment,
  TEnv = unknown,
> {
  object: DurableObject<TEnv>
  currentWebsocket: WebSocket
  websocketManager: DurableEventIteratorObjectWebsocketManager<TEventPayload, TJwtAttachment, TWsAttachment>
}

const base = os.$context<DurableEventIteratorObjectRouterContext<any, any, any>>()

export const durableEventIteratorRouter = base.router({
  subscribe: base.subscribe.handler(({ context, lastEventId }) => {
    return new HibernationEventIterator<any>((hibernationId) => {
      context.websocketManager.serializeInternalAttachment(context.currentWebsocket, {
        [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: hibernationId,
      })

      if (lastEventId !== undefined) {
        context.websocketManager.sendMissingEvents(context.currentWebsocket, hibernationId, lastEventId)
      }
    })
  }),

  call: base.call.handler(({ context, input, signal, lastEventId }) => {
    const allowMethods = context.websocketManager.deserializeAttachment(context.currentWebsocket)['dei:jwtp'].alm
    const [method, ...path] = input.path

    if (!allowMethods?.includes(method)) {
      throw new ORPCError('FORBIDDEN', {
        message: `Method "${method}" is not allowed.`,
      })
    }

    const nestedClient = (context.object as any)[method](context.currentWebsocket)

    const client = get(nestedClient, path) as Client<any, any, any, any>

    return client(input.input, { signal, lastEventId })
  }),
})
