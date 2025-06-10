import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export type experimental_MinimalWebsocket = Pick<WebSocket, 'addEventListener' | 'send'>

export class experimental_WebsocketHandler<T extends Context> {
  readonly #peers = new WeakMap<experimental_MinimalWebsocket, ServerPeer>()
  readonly #handler: StandardHandler<T>

  constructor(
    standardHandler: StandardHandler<T>,
  ) {
    this.#handler = standardHandler
  }

  /**
   * Upgrades a WebSocket to enable handling
   *
   * This attaches the necessary 'message' and 'close' listeners to the WebSocket
   *
   * @warning Do not use this method if you're using `.message()` or `.close()`
   */
  upgrade(ws: experimental_MinimalWebsocket, ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>): void {
    ws.addEventListener('message', event => this.message(ws, event.data, ...rest))
    ws.addEventListener('close', () => this.close(ws))
  }

  /**
   * Handles a single message received from a WebSocket.
   *
   * @warning Avoid calling this directly if `.upgrade()` is used.
   *
   * @param ws The WebSocket instance
   * @param data The message payload, usually place in `event.data`
   */
  async message(ws: experimental_MinimalWebsocket, data: string | ArrayBuffer | Blob, ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>): Promise<void> {
    let peer = this.#peers.get(ws)

    if (!peer) {
      this.#peers.set(ws, peer = new ServerPeer(ws.send.bind(ws)))
    }

    const message = data instanceof Blob
      ? await data.arrayBuffer()
      : data

    const [id, request] = await peer.message(message)

    if (!request) {
      return
    }

    const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

    const { response } = await this.#handler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

    await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
  }

  /**
   * Closes the WebSocket peer and cleans up.
   *
   * @warning Avoid calling this directly if `.upgrade()` is used.
   */
  close(ws: experimental_MinimalWebsocket): void {
    const peer = this.#peers.get(ws)

    if (peer) {
      peer.close()
    }
  }
}
