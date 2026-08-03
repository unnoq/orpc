import type { Context } from '../../context'
import type { Router } from '../../router'
import type { RPCHandlerCodecOptions, StandardHandlerOptions } from '../standard'
import type { FastifyHandlerOptions } from './handler'
import { toArray } from '@orpc/shared'
import { CSRFGuardHandlerPlugin } from '../../plugins'
import { RPCHandlerCodec, StandardHandler } from '../standard'
import { FastifyHandler } from './handler'

export interface RPCHandlerOptions<T extends Context>
  extends FastifyHandlerOptions<T>, Omit<StandardHandlerOptions<T>, 'plugins'>, RPCHandlerCodecOptions<T> {

  /**
   * Configuration for {@link CSRFGuardHandlerPlugin}, which is enabled by default for `RPCHandler` over HTTP.
   */
  csrfGuardPlugin?: {
    /**
     * If `false`, this plugin is disabled.
     *
     * @default true
     */
    enabled?: boolean
  }
}

/**
 * Serves an oRPC router over the RPC protocol inside a Fastify server.
 *
 * @see {@link https://orpc.dev/docs/adapters/fastify | Fastify}
 */
export class RPCHandler<T extends Context> extends FastifyHandler<T> {
  constructor(
    router: Router<T>,
    options: NoInfer<RPCHandlerOptions<T>> = {},
  ) {
    if (options.csrfGuardPlugin?.enabled !== false) {
      options = {
        ...options,
        plugins: [...toArray(options.plugins), new CSRFGuardHandlerPlugin()],
      }
    }

    const codec = new RPCHandlerCodec(router, options)
    const handler = new StandardHandler(codec, options)
    super(handler, options)
  }
}
