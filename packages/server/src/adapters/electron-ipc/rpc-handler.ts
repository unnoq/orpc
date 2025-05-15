import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import type { experimental_ElectronIPCHandlerOptions as ElectronIPCHandlerOptions } from './handler'
import { StandardRPCHandler } from '../standard'
import { experimental_ElectronIPCHandler as ElectronIPCHandler } from './handler'

export interface experimental_RPCHandlerOptions<T extends Context>
  extends StandardRPCHandlerOptions<T>, ElectronIPCHandlerOptions {}

/**
 * RPC Handler for Electron IPC
 *
 * @see {@link https://orpc.unnoq.com/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.unnoq.com/docs/integrations/electron-ipc Electron IPC Integration Docs}
 */
export class experimental_RPCHandler<T extends Context> extends ElectronIPCHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<experimental_RPCHandlerOptions<T>> = {}) {
    super(new StandardRPCHandler(router, options), options)
  }
}
