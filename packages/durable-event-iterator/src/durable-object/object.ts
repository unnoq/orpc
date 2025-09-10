import type { StandardRPCHandlerOptions } from '@orpc/server/standard'
import type {
  DurableEventIteratorObject as IDurableEventIteratorObject,
  DurableEventIteratorObjectDef as IDurableEventIteratorObjectDef,
  TokenAtt,
} from '../object'
import type { TokenPayload } from '../schemas'
import type { DurableEventIteratorObjectRouterContext } from './handler'
import type { DurableEventIteratorObjectState } from './object-state'
import { encodeHibernationRPCEvent, HibernationPlugin } from '@orpc/server/hibernation'
import { RPCHandler } from '@orpc/server/websocket'
import { toArray } from '@orpc/shared'
import { DurableObject } from 'cloudflare:workers'
import { DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY } from './consts'
import { durableEventIteratorRouter } from './handler'
import { createDurableEventIteratorObjectState } from './object-state'
import { toDurableEventIteratorWebsocket } from './websocket'

export interface PublishEventOptions {
  /**
   * Specific websockets to send the event to.
   *
   * @default this.ctx.getWebSockets()
   */
  targets?: WebSocket[]

  /**
   * Websockets to exclude from receiving the event.
   *
   * @default []
   */
  skip?: WebSocket[]
}

export interface DurableEventIteratorObjectOptions
  extends StandardRPCHandlerOptions<DurableEventIteratorObjectRouterContext> {
}

export interface DurableEventIteratorObjectDef<
  TEventPayload extends object,
  TTokenAtt extends TokenAtt,
> extends IDurableEventIteratorObjectDef<TEventPayload, TTokenAtt> {
  handler: RPCHandler<DurableEventIteratorObjectRouterContext>
  options: DurableEventIteratorObjectOptions
}

export class DurableEventIteratorObject<
  TEventPayload extends object,
  TTokenAttachment extends TokenAtt = TokenAtt,
  TEnv = unknown,
> extends DurableObject<TEnv> implements IDurableEventIteratorObject<TEventPayload, TTokenAttachment> {
  '~orpc': DurableEventIteratorObjectDef<TEventPayload, TTokenAttachment>

  protected override ctx: DurableEventIteratorObjectState

  constructor(
    ctx: DurableObjectState,
    env: TEnv,
    options: DurableEventIteratorObjectOptions = {},
  ) {
    super(ctx, env)

    this.ctx = createDurableEventIteratorObjectState(ctx)

    const handler = new RPCHandler(durableEventIteratorRouter, {
      ...options,
      plugins: [
        ...toArray(options.plugins),
        new HibernationPlugin(),
      ],
    })

    this['~orpc'] = {
      handler,
      options,
    }
  }

  /**
   * Internally used to upgrade the WebSocket connection
   *
   * @warning No verification is done here, you should verify the token payload before calling this method.
   */
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const payload = JSON.parse(url.searchParams.get(DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY)!) as TokenPayload

    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)
    toDurableEventIteratorWebsocket(server)['~orpc'].serializeTokenPayload(payload)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * Internally used to handle WebSocket messages
   *
   * @info This method
   */
  override async webSocketMessage(websocket_: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const websocket = toDurableEventIteratorWebsocket(websocket_)

    websocket['~orpc'].closeIfExpired()
    if (websocket.readyState !== WebSocket.OPEN) {
      return
    }

    await this['~orpc'].handler.message(websocket, message, {
      context: {
        object: this,
        websocket,
      },
    })
  }

  override webSocketClose(websocket: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    this['~orpc'].handler.close(websocket)
  }

  /**
   * Publish an event to clients
   */
  publishEvent(payload: TEventPayload, options: PublishEventOptions = {}): void {
    const targets = options.targets ?? this.ctx.getWebSockets()
    const skip = options.skip?.map(ws => toDurableEventIteratorWebsocket(ws))

    for (const ws of targets) {
      const durableWs = toDurableEventIteratorWebsocket(ws)

      if (skip?.some(excluded => excluded['~orpc'].original === durableWs['~orpc'].original)) {
        continue
      }

      const hibernationId = durableWs['~orpc'].deserializeHibernationId()

      // Maybe the connection not finished the subscription process yet
      if (typeof hibernationId !== 'string') {
        continue
      }

      ws.send(encodeHibernationRPCEvent(hibernationId, payload, this['~orpc'].options))
    }
  }
}
