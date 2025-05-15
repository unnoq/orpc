import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptions } from '../../types'
import type { StandardLinkClient } from '../standard'
import type { experimental_ExposedORPCHandlerChannel as ExposedORPCHandlerChannel } from './types'
import { ClientPeer } from '@orpc/standard-server-peer'
import { DEFAULT_ORPC_HANDLER_CHANNEL } from './consts'

export interface experimental_LinkElectronIPCClientOptions {
  /**
   * The channel name exposed by the Electron IPC handler.
   *
   * @default 'orpc:default'
   */
  channel?: string
}

export class experimental_LinkElectronIPCClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly peer: ClientPeer

  constructor(options: experimental_LinkElectronIPCClientOptions = {}) {
    const channel = options.channel ?? DEFAULT_ORPC_HANDLER_CHANNEL

    const exposed: ExposedORPCHandlerChannel | undefined = (globalThis as any)[channel]

    if (!exposed) {
      throw new Error(`Cannot find exposed ORPC handler channel at globalThis['${channel}']`)
    }

    this.peer = new ClientPeer(async (message) => {
      exposed.send(message instanceof Blob ? await message.arrayBuffer() : message)
    })

    exposed.receive((message) => {
      this.peer.message(message)
    })
  }

  async call(request: StandardRequest, _options: ClientOptions<T>, _path: readonly string[], _input: unknown): Promise<StandardLazyResponse> {
    const response = await this.peer.request(request)
    return { ...response, body: () => Promise.resolve(response.body) }
  }
}
