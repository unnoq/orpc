import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import { StandardRPCHandler } from '../standard'
import { experimental_CrosswsHandler as CrosswsHandler } from './handler'

/**
 * RPC Handler for Crossws adapter
 *
 * @see {@link https://orpc.dev/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/websocket Websocket Adapter Docs}
 */
export class experimental_RPCHandler<T extends Context> extends CrosswsHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T>> = {}) {
    super(new StandardRPCHandler(router, options))
  }
}
