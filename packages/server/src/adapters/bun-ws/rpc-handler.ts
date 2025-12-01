import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import { StandardRPCHandler } from '../standard'
import { BunWsHandler } from './handler'

/**
 * RPC Handler for Bun WS adapter
 *
 * @see {@link https://orpc.dev/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/websocket Websocket Adapter Docs}
 */
export class RPCHandler<T extends Context> extends BunWsHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardRPCHandlerOptions<T>> = {}) {
    super(new StandardRPCHandler(router, options))
  }
}
