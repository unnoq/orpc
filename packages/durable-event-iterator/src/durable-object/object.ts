import type { StandardRPCHandlerOptions } from '@orpc/server/standard'
import type { DurableEventIteratorObject as BaseDurableEventIteratorObject, JwtAttachment } from '../object'
import type { DurableEventIteratorJwtPayload } from '../schemas'
import type { DurableEventIteratorObjectEventStorageOptions } from './event-storage'
import type { DurableEventIteratorObjectRouterContext } from './router'
import type { DurableEventIteratorObjectWebsocketAttachment, DurableEventIteratorObjectWebsocketManagerOptions } from './websocket-manager'
import { experimental_HibernationPlugin as HibernationPlugin } from '@orpc/server/hibernation'
import { experimental_RPCHandler as RPCHandler } from '@orpc/server/websocket'
import { toArray } from '@orpc/shared'
import { DurableObject } from 'cloudflare:workers'
import { DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL } from '../object'
import { DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from './consts'
import { DurableEventIteratorObjectEventStorage } from './event-storage'
import { durableEventIteratorRouter } from './router'
import { DurableEventIteratorObjectWebsocketManager } from './websocket-manager'

export interface DurableEventIteratorObjectOptions<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment,
>
  extends Omit<DurableEventIteratorObjectWebsocketManagerOptions<TEventPayload>, 'eventStorage'>,
  DurableEventIteratorObjectEventStorageOptions,
  StandardRPCHandlerOptions<DurableEventIteratorObjectRouterContext<TEventPayload, TJwtAttachment, TWsAttachment>> {

}

export class DurableEventIteratorObject<
  TEventPayload extends object,
  TJwtAttachment extends JwtAttachment = JwtAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment = DurableEventIteratorObjectWebsocketAttachment,
  TEnv = unknown,
> extends DurableObject<TEnv> implements BaseDurableEventIteratorObject<TEventPayload, TJwtAttachment> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    jwtAttachment: TJwtAttachment
  }

  protected readonly dei: {
    handler: RPCHandler<DurableEventIteratorObjectRouterContext<TEventPayload, TJwtAttachment, TWsAttachment>>
    eventStorage: DurableEventIteratorObjectEventStorage<TEventPayload>
    websocketManager: DurableEventIteratorObjectWebsocketManager<TEventPayload, TJwtAttachment, TWsAttachment>
  }

  constructor(
    ctx: DurableObjectState,
    env: TEnv,
    options: DurableEventIteratorObjectOptions<TEventPayload, TJwtAttachment, TWsAttachment> = {},
  ) {
    super(ctx, env)

    const handler = new RPCHandler(durableEventIteratorRouter, {
      ...options,
      plugins: [
        ...toArray(options.plugins),
        new HibernationPlugin(),
      ],
    })

    const eventStorage = new DurableEventIteratorObjectEventStorage<TEventPayload>(ctx, options)

    this.dei = {
      handler,
      eventStorage,
      websocketManager: new DurableEventIteratorObjectWebsocketManager(ctx, {
        ...options,
        eventStorage,
      }),
    }
  }

  /**
   * Internally used to upgrade the WebSocket connection
   *
   * @warning No verification is done here, you should verify the JWT payload before calling this method.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const payload = JSON.parse(url.searchParams.get(DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY)!) as DurableEventIteratorJwtPayload

    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)
    this.dei.websocketManager.serializeInternalAttachment(server, {
      [DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY]: payload,
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  override async webSocketMessage(websocket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.dei.handler.message(websocket, message, {
      context: {
        object: this,
        currentWebsocket: websocket,
        websocketManager: this.dei.websocketManager,
      },
    })
  }

  override webSocketClose(websocket: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    this.dei.handler.close(websocket)
  }
}
