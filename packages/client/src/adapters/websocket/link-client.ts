import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptions } from '../../types'
import type { StandardLinkClient } from '../standard'
import { readAsBuffer } from '@orpc/shared'
import { ClientPeer } from '@orpc/standard-server-peer'

export interface LinkWebsocketClientOptions {
  websocket: Pick<WebSocket, 'addEventListener' | 'send' | 'readyState'>
}

export class LinkWebsocketClient<T extends ClientContext> implements StandardLinkClient<T> {
  private readonly peer: ClientPeer

  constructor(options: LinkWebsocketClientOptions) {
    const untilOpen = new Promise<void>((resolve) => {
      if (options.websocket.readyState === 0) { // CONNECTING
        options.websocket.addEventListener('open', () => {
          resolve()
        }, { once: true })
      }
      else {
        resolve()
      }
    })

    this.peer = new ClientPeer(async (message) => {
      await untilOpen
      return options.websocket.send(message)
    })

    options.websocket.addEventListener('message', async (event) => {
      const message = event.data instanceof Blob
        ? await readAsBuffer(event.data)
        : event.data

      this.peer.message(message)
    })

    options.websocket.addEventListener('close', () => {
      this.peer.close()
    })
  }

  async call(request: StandardRequest, _options: ClientOptions<T>, _path: readonly string[], _input: unknown): Promise<StandardLazyResponse> {
    const response = await this.peer.request(request)
    return { ...response, body: () => Promise.resolve(response.body) }
  }
}
