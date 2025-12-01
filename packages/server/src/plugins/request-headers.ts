import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import { toFetchHeaders } from '@orpc/standard-server-fetch'

export interface RequestHeadersPluginContext {
  reqHeaders?: Headers
}

/**
 * The Request Headers Plugin injects a `reqHeaders` instance into the context,
 * allowing access to request headers in oRPC.
 *
 * @see {@link https://orpc.dev/docs/plugins/request-headers Request Headers Plugin Docs}
 */
export class RequestHeadersPlugin<T extends RequestHeadersPluginContext> implements StandardHandlerPlugin<T> {
  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []

    options.rootInterceptors.push((interceptorOptions) => {
      const reqHeaders = interceptorOptions.context.reqHeaders ?? toFetchHeaders(interceptorOptions.request.headers)

      return interceptorOptions.next({
        ...interceptorOptions,
        context: {
          ...interceptorOptions.context,
          reqHeaders,
        },
      })
    })
  }
}
