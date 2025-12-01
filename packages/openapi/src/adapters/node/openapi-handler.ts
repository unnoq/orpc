import type { Context, Router } from '@orpc/server'
import type { NodeHttpHandlerOptions } from '@orpc/server/node'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { NodeHttpHandler } from '@orpc/server/node'
import { StandardOpenAPIHandler } from '../standard'

export interface OpenAPIHandlerOptions<T extends Context> extends NodeHttpHandlerOptions<T>, Omit<StandardOpenAPIHandlerOptions<T>, 'plugins'> {
}

/**
 * OpenAPI Handler for Node Server
 *
 * @see {@link https://orpc.dev/docs/openapi/openapi-handler OpenAPI Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/http HTTP Adapter Docs}
 */
export class OpenAPIHandler<T extends Context> extends NodeHttpHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<OpenAPIHandlerOptions<T>> = {}) {
    super(new StandardOpenAPIHandler(router, options), options)
  }
}
