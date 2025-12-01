import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import type { FetchHandlerOptions } from './handler'
import { StrictGetMethodPlugin } from '../../plugins'
import { StandardRPCHandler } from '../standard'
import { FetchHandler } from './handler'

export interface RPCHandlerOptions<T extends Context> extends FetchHandlerOptions<T>, Omit<StandardRPCHandlerOptions<T>, 'plugins'> {
  /**
   * Enables or disables the StrictGetMethodPlugin.
   *
   * @default true
   */
  strictGetMethodPluginEnabled?: boolean
}

/**
 * RPC Handler for Fetch Server
 *
 * @see {@link https://orpc.dev/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/http HTTP Adapter Docs}
 */
export class RPCHandler<T extends Context> extends FetchHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<RPCHandlerOptions<T>> = {}) {
    if (options.strictGetMethodPluginEnabled ?? true) {
      options.plugins ??= []
      options.plugins.push(new StrictGetMethodPlugin())
    }

    super(new StandardRPCHandler(router, options), options)
  }
}
