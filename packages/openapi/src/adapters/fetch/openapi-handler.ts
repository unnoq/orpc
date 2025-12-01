import type { Context, Router } from '@orpc/server'
import type { FetchHandlerOptions } from '@orpc/server/fetch'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { FetchHandler } from '@orpc/server/fetch'
import { StandardOpenAPIHandler } from '../standard'

export interface OpenAPIHandlerOptions<T extends Context> extends FetchHandlerOptions<T>, Omit<StandardOpenAPIHandlerOptions<T>, 'plugins'> {
}

/**
 * OpenAPI Handler for Fetch Server
 *
 * @see {@link https://orpc.dev/docs/openapi/openapi-handler OpenAPI Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/http HTTP Adapter Docs}
 */
export class OpenAPIHandler<T extends Context> extends FetchHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<OpenAPIHandlerOptions<T>> = {}) {
    super(new StandardOpenAPIHandler(router, options), options)
  }
}
