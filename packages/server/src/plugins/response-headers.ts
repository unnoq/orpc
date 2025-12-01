import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import { clone } from '@orpc/shared'

export interface ResponseHeadersPluginContext {
  resHeaders?: Headers
}

/**
 * The Response Headers Plugin allows you to set response headers in oRPC.
 * It injects a resHeaders instance into the context, enabling you to modify response headers easily.
 *
 * @see {@link https://orpc.dev/docs/plugins/response-headers Response Headers Plugin Docs}
 */
export class ResponseHeadersPlugin<T extends ResponseHeadersPluginContext> implements StandardHandlerPlugin<T> {
  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []

    options.rootInterceptors.push(async (interceptorOptions) => {
      const resHeaders = interceptorOptions.context.resHeaders ?? new Headers()

      const result = await interceptorOptions.next({
        ...interceptorOptions,
        context: {
          ...interceptorOptions.context,
          resHeaders,
        },
      })

      if (!result.matched) {
        return result
      }

      const responseHeaders = clone(result.response.headers)

      for (const [key, value] of resHeaders) {
        if (Array.isArray(responseHeaders[key])) {
          responseHeaders[key].push(value)
        }
        else if (responseHeaders[key] !== undefined) {
          responseHeaders[key] = [responseHeaders[key], value]
        }
        else {
          responseHeaders[key] = value
        }
      }

      return {
        ...result,
        response: {
          ...result.response,
          headers: responseHeaders,
        },
      }
    })
  }
}
