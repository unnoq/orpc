import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2'

export type NodeHttpRequest = (IncomingMessage | Http2ServerRequest) & {
  /**
   * Replace `req.url` with `req.originalUrl` when `req.originalUrl` is available.
   * This is useful for `express.js` middleware.
   */
  originalUrl?: string

  /**
   * Prefer parsed body if it is available.
   */
  body?: unknown
}

export type NodeHttpResponse = ServerResponse | Http2ServerResponse
