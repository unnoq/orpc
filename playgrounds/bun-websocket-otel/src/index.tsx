import './instrumentation'

import { serve } from 'bun'
import index from './index.html'
import { router } from './router'
import { RPCHandler } from '@orpc/server/bun-ws'
import { OTEL_TRACE_EXPORTER_URL } from './consts'
import { trace } from '@opentelemetry/api'

const handler = new RPCHandler(router, {
  interceptors: [
    ({ request, next }) => {
      const span = trace.getActiveSpan()

      request.signal?.addEventListener('abort', () => {
        span?.addEvent('aborted', { reason: String(request.signal?.reason) })
      })

      return next()
    },
  ],
})

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    '/*': index,

    '/ws/rpc': (req, server) => {
      if (server.upgrade(req)) {
        return new Response('Update successful')
      }

      return new Response('Upgrade failed', { status: 500 })
    },

    /**
     * Proxy OpenTelemetry trace exporter requests to the OTLP endpoint.
     * To avoid CORS issues, ensure the OTLP endpoint allows requests from this server.
     */
    '/otel/traces': (req) => {
      return fetch(OTEL_TRACE_EXPORTER_URL, req)
    },
  },

  websocket: {
    message(ws, message) {
      handler.message(ws, message, {
        context: {}, // Provide initial context if needed
      })
    },
    close(ws) {
      handler.close(ws)
    },
  },

  development: process.env.NODE_ENV !== 'production' && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
})

console.log(`🚀 Server running at ${server.url}`)
