import type { Client } from '@orpc/client'
import type { RPCHandlerOptions } from '@orpc/server/websocket'
import type { DurableObject } from 'cloudflare:workers'
import type { DurableIteratorObjectDef } from '../object'
import type { DurableIteratorObjectState } from './object-state'
import type { EventResumeStorageOptions } from './resume-storage'
import type { DurableIteratorWebsocket } from './websocket'
import { implement, ORPCError } from '@orpc/server'
import { encodeHibernationRPCEvent, HibernationEventIterator, HibernationPlugin } from '@orpc/server/hibernation'
import { RPCHandler } from '@orpc/server/websocket'
import { get, stringifyJSON, toArray } from '@orpc/shared'
import { DURABLE_ITERATOR_ID_PARAM, DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { durableIteratorContract } from '../contract'
import { verifyDurableIteratorToken } from '../schemas'
import { toDurableIteratorObjectState } from './object-state'
import { EventResumeStorage } from './resume-storage'
import { toDurableIteratorWebsocket } from './websocket'

const os = implement(durableIteratorContract)

type DurableIteratorObjectRouterContext = {
  object: DurableObject<any>
  resumeStorage: EventResumeStorage<any>
  websocket: DurableIteratorWebsocket
  options: DurableIteratorObjectHandlerOptions
}

const base = os.$context<DurableIteratorObjectRouterContext>()

const router = base.router({
  updateToken: base.updateToken.handler(async ({ context, input }) => {
    const payload = await verifyDurableIteratorToken(context.options.signingKey, input.token)

    if (!payload) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Invalid Token' })
    }

    const old = context.websocket['~orpc'].deserializeTokenPayload()

    if (payload.chn !== old.chn) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Updated token must have the same channel with the original token' })
    }

    if (stringifyJSON(payload.tags) !== stringifyJSON(old.tags)) {
      throw new ORPCError('UNAUTHORIZED', { message: 'Updated token must have the exact same tags with the original token' })
    }

    context.websocket['~orpc'].serializeTokenPayload(payload)
  }),
  subscribe: base.subscribe.handler(({ context, lastEventId }) => {
    return new HibernationEventIterator<any>((hibernationId) => {
      context.websocket['~orpc'].serializeHibernationId(hibernationId)

      if (typeof lastEventId === 'string') {
        const resumePayloads = context.resumeStorage.get(context.websocket, lastEventId)

        try {
          for (const payload of resumePayloads) {
            context.websocket.send(
              encodeHibernationRPCEvent(hibernationId, payload, context.options),
            )
          }
        }
        catch {
          // ignore sending errors (probably already closed or expired)
        }
      }

      context.options.onSubscribed?.(context.websocket, lastEventId)
    })
  }),

  call: base.call.handler(({ context, input, signal, lastEventId }) => {
    const allowMethods = context.websocket['~orpc'].deserializeTokenPayload().rpc
    const [method, ...path] = input.path

    if (!allowMethods?.includes(method)) {
      throw new ORPCError('FORBIDDEN', {
        message: `Method "${method}" is not allowed.`,
      })
    }

    const nestedClient = (context.object as any)[method](context.websocket)

    const client = get(nestedClient, path) as Client<any, any, any, any>

    return client(input.input, { signal, lastEventId })
  }),
})

export interface PublishEventOptions {
  /**
   * Restrict the event to a specific set of websockets.
   *
   * Use this when security is important — only the listed websockets
   * will ever receive the event. Newly connected websockets are not
   * included unless explicitly added here.
   */
  targets?: WebSocket[]

  /**
   * Exclude certain websockets from receiving the event.
   *
   * Use this when broadcasting widely but skipping a few clients
   * (e.g., the sender). Newly connected websockets may still receive
   * the event if not listed here, so this is less strict than `targets`.
   */
  exclude?: WebSocket[]
}

export interface DurableIteratorObjectHandlerOptions extends RPCHandlerOptions<DurableIteratorObjectRouterContext>, EventResumeStorageOptions {
  /**
   * The signing key to use verify the token.
   */
  signingKey: string

  /**
   * Called after a client successfully subscribes to the main iterator.
   * You can start sending events to the client here.
   *
   * @param websocket Corresponding WebSocket connection.
   * @param lastEventId Can be `undefined` if this is the first connection (not a resumed session).
   */
  onSubscribed?: (websocket: DurableIteratorWebsocket, lastEventId: string | undefined) => void
}

export class DurableIteratorObjectHandler<
  T extends object,
> implements DurableIteratorObjectDef<T> {
  '~eventPayloadType'?: { type: T } // Helps DurableIteratorObjectDef infer the type

  private readonly handler: RPCHandler<DurableIteratorObjectRouterContext>
  private readonly resumeStorage: EventResumeStorage<T>

  /**
   * Proxied, ensure you don't accidentally change internal state, and auto close if expired websockets before .send is called
   */
  ctx: DurableIteratorObjectState

  constructor(
    ctx: DurableObjectState,
    private readonly object: DurableObject<any>,
    private readonly options: DurableIteratorObjectHandlerOptions,
  ) {
    this.ctx = toDurableIteratorObjectState(ctx)

    this.resumeStorage = new EventResumeStorage<T>(ctx, options)

    this.handler = new RPCHandler(router, {
      ...options,
      plugins: [
        ...toArray(options.plugins),
        new HibernationPlugin(),
      ],
    })

    /**
     * Optional, but this is a good place to close expired websockets
     * since it happens before anything else is processed.
     */
    this.ctx.getWebSockets().forEach(ws => ws['~orpc'].closeIfExpired())
  }

  /**
   * Publish an event to a set of clients.
   */
  publishEvent(payload: T, options: PublishEventOptions = {}): void {
    const targets = options.targets?.map(ws => toDurableIteratorWebsocket(ws))
    const exclude = options.exclude?.map(ws => toDurableIteratorWebsocket(ws))

    // update payload metadata
    payload = this.resumeStorage.store(payload, { targets, exclude })

    const excludeIds = exclude?.map(ws => ws['~orpc'].deserializeId())
    const fallbackTargets = targets ?? this.ctx.getWebSockets().map(ws => toDurableIteratorWebsocket(ws))

    for (const ws of fallbackTargets) {
      if (excludeIds?.includes(ws['~orpc'].deserializeId())) {
        continue
      }

      const hibernationId = ws['~orpc'].deserializeHibernationId()

      // Maybe the connection not finished the subscription process yet
      if (typeof hibernationId !== 'string') {
        continue
      }

      const data = encodeHibernationRPCEvent(hibernationId, payload, this.options)

      try {
        ws.send(data)
      }
      catch {
        // ignore sending errors (probably already closed or expired)
      }
    }
  }

  /**
   * This method is called when a HTTP request is received for upgrading to a WebSocket connection.
   * Should mapping with corresponding `fetch` inside durable object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const token = url.searchParams.getAll(DURABLE_ITERATOR_TOKEN_PARAM).at(-1)
    const id = url.searchParams.getAll(DURABLE_ITERATOR_ID_PARAM).at(-1)

    if (typeof id !== 'string') {
      return new Response('ID is required', { status: 401 })
    }

    if (typeof token !== 'string') {
      return new Response('Token is required', { status: 401 })
    }

    const payload = await verifyDurableIteratorToken(this.options.signingKey, token)

    if (!payload) {
      return new Response('Invalid Token', { status: 401 })
    }

    const { '0': client, '1': server } = new WebSocketPair()

    if (payload.tags) {
      this.ctx.acceptWebSocket(server, [...payload.tags])
    }
    else {
      this.ctx.acceptWebSocket(server)
    }

    toDurableIteratorWebsocket(server)['~orpc'].serializeId(id)
    toDurableIteratorWebsocket(server)['~orpc'].serializeTokenPayload(payload)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * This method is called when a WebSocket message is received.
   * Should mapping with corresponding `webSocketMessage` inside durable object
   */
  async webSocketMessage(websocket_: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const websocket = toDurableIteratorWebsocket(websocket_)

    websocket['~orpc'].closeIfExpired()
    if (websocket.readyState !== WebSocket.OPEN) {
      return
    }

    // `websocket` auto close if expired on every send
    await this.handler.message(websocket, message, {
      context: {
        websocket,
        object: this.object,
        resumeStorage: this.resumeStorage,
        options: this.options,
      },
    })
  }

  /**
   * This method is called when a WebSocket connection is closed.
   * Should mapping with corresponding `webSocketClose` inside durable object
   */
  webSocketClose(ws_: WebSocket, _code: number, _reason: string, _wasClean: boolean): void | Promise<void> {
    const ws = toDurableIteratorWebsocket(ws_)
    /**
     * Since `webSocketMessage` operates on DurableIteratorWebSocket,
     * we must also use DurableIteratorWebSocket to guarantee reference equality.
     * The WebSocket adapter relies on this reference consistency.
     *
     * @info toDurableIteratorWebsocket will ensure the same input WebSocket always maps to the same DurableIteratorWebSocket
     */
    this.handler.close(ws)
  }
}
