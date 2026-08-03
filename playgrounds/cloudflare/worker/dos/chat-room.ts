import { encodeHibernationRPCEvent, HibernationAsyncIteratorClass, HibernationHandlerPlugin } from '@orpc/hibernation'
import { ORPCInstrumentation } from '@orpc/opentelemetry'
import { onError, os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/websocket'
import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

/**
 * `@microlabs/otel-cf-workers` cannot instrument hibernatable WebSocket handlers,
 * and its tracer throws when used outside an instrumented trigger. In dev the
 * Durable Object shares the isolate with the instrumented worker, so oRPC
 * tracing must be suspended while handling WebSocket messages.
 */
async function withoutOpenTelemetry<T>(fn: () => Promise<T>): Promise<T> {
  const instrumentation = new ORPCInstrumentation()

  try {
    instrumentation.disable()
    return await fn()
  }
  finally {
    instrumentation.enable()
  }
}

const base = os.$context<{
  ws: WebSocket
  getWebSockets: () => WebSocket[]
}>()

export const chatRoomRouter = {
  send: base
    .input(z.object({ message: z.string().min(1) }))
    .handler(async ({ context }, { message }) => {
      for (const ws of context.getWebSockets()) {
        const data = ws.deserializeAttachment()
        if (typeof data !== 'object' || data === null) {
          continue
        }

        const { id } = data

        ws.send(await encodeHibernationRPCEvent(id, { message }))
      }
    }),
  onMessage: base.handler(async ({ context }) => {
    return new HibernationAsyncIteratorClass<{ message: string }>((id) => {
      // Persist the ID so events can be sent after the DO wakes from hibernation.
      context.ws.serializeAttachment({ id })
    })
  }),
}

const handler = new RPCHandler(chatRoomRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new HibernationHandlerPlugin(),
  ],
})

export class ChatRoomDO extends DurableObject {
  async fetch(): Promise<Response> {
    const { '0': client, '1': server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await withoutOpenTelemetry(() => handler.message(ws, message, {
      context: {
        ws,
        getWebSockets: () => this.ctx.getWebSockets(),
      },
    }))
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await withoutOpenTelemetry(() => handler.close(ws))
  }
}
