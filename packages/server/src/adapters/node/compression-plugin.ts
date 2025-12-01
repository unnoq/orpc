import type { NodeHttpRequest, NodeHttpResponse } from '@orpc/standard-server-node'
import type { Context } from '../../context'
import type { NodeHttpHandlerOptions } from './handler'
import type { NodeHttpHandlerPlugin } from './plugin'
import compression from '@orpc/interop/compression'

export interface CompressionPluginOptions extends compression.CompressionOptions {
  /**
   * Override the default content-type filter used to determine which responses should be compressed.
   *
   * @warning [Event Iterator](https://orpc.dev/docs/event-iterator) responses are never compressed, regardless of this filter's return value.
   * @default only responses with compressible content types are compressed.
   */
  filter?: (req: NodeHttpRequest, res: NodeHttpResponse) => boolean
}
/**
 * The Compression Plugin adds response compression to the Node.js HTTP Server.
 *
 * @see {@link https://orpc.dev/docs/plugins/compression Compression Plugin Docs}
 */
export class CompressionPlugin<T extends Context> implements NodeHttpHandlerPlugin<T> {
  private readonly compressionHandler: ReturnType<typeof compression>

  constructor(options: CompressionPluginOptions = {}) {
    this.compressionHandler = compression({
      ...options,
      filter: (req, res) => {
        const hasContentDisposition = res.hasHeader('content-disposition')
        const contentType = res.getHeader('content-type')?.toString()

        /**
         * Never compress Event Iterator responses.
         */
        if (!hasContentDisposition && contentType?.startsWith('text/event-stream')) {
          return false
        }

        return options.filter
          ? options.filter(req, res)
          : compression.filter(req, res)
      },
    })
  }

  initRuntimeAdapter(options: NodeHttpHandlerOptions<T>): void {
    options.adapterInterceptors ??= []

    /**
     * use `unshift` to ensure this runs before user-defined adapter interceptors
     */
    options.adapterInterceptors.unshift(async (options) => {
      let resolve: (value: Awaited<ReturnType<typeof options.next>>) => void
      let reject: (reason?: any) => void
      const promise = new Promise<Awaited<ReturnType<typeof options.next>>>((res, rej) => {
        resolve = res
        reject = rej
      })

      /**
       * These methods are proxied by the compression handler, so we need to
       * store the original methods to call them after compression is done
       * to prevent side effects to other code outside of this plugin.
       * https://github.com/expressjs/compression/blob/master/index.js#L97-L153
       */
      const originalWrite = options.response.write
      const originalEnd = options.response.end
      const originalOn = options.response.on

      this.compressionHandler(
        options.request as any,
        options.response as any,
        async (err) => {
          /* v8 ignore next 3 - this never happen in realtime: https://github.com/expressjs/compression/blob/master/index.js#L243 */
          if (err) {
            reject(err)
          }
          else {
            try {
              resolve(await options.next())
            }
            catch (error) {
              reject(error)
            }
          }
        },
      )

      try {
        return await promise
      }
      finally {
        options.response.write = originalWrite
        options.response.end = originalEnd
        options.response.on = originalOn
      }
    })
  }
}
