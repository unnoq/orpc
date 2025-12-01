import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import { StandardRPCHandler } from '../standard'
import { WsHandler } from './handler'

/**
 * RPC Handler for ws (node ws) adapter
 *
 * @see {@link https://orpc.dev/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/websocket Websocket Adapter Docs}
 */
export class RPCHandler<T extends Context> extends WsHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T>> = {}) {
    super(new StandardRPCHandler(router, options))
  }
}
