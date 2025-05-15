import type { ClientContext } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { experimental_LinkElectronIPCClientOptions as LinkElectronIPCClientOptions } from './link-client'
import { StandardRPCLink } from '../standard'
import { experimental_LinkElectronIPCClient as LinkElectronIPCClient } from './link-client'

export interface experimental_RPCLinkOptions<T extends ClientContext>
  extends Omit<StandardRPCLinkOptions<T>, 'url' | 'headers' | 'method' | 'fallbackMethod' | 'maxUrlLength'>, LinkElectronIPCClientOptions {}

/**
 * The RPC Link communicates with the server using the RPC protocol over Electron IPC.
 *
 * @see {@link https://orpc.unnoq.com/docs/client/rpc-link RPC Link Docs}
 * @see {@link https://orpc.unnoq.com/docs/integrations/electron-ipc Electron IPC Integration Docs}
 */
export class experimental_RPCLink<T extends ClientContext> extends StandardRPCLink<T> {
  constructor(options: experimental_RPCLinkOptions<T> = {}) {
    const linkClient = new LinkElectronIPCClient(options)
    super(linkClient, { ...options, url: 'orpc:/' })
  }
}
