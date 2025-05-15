import type { MaybeOptionalOptions } from '@orpc/shared'
import type { WebContents } from 'electron'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { DEFAULT_ORPC_HANDLER_CHANNEL } from '@orpc/client/electron-ipc'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import { ipcMain } from 'electron'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export interface experimental_ElectronIPCHandlerOptions {
  /**
   * The channel name exposed by the Electron IPC handler.
   *
   * @default 'orpc:default'
   */
  channel?: string
}

export class experimental_ElectronIPCHandler<T extends Context> {
  readonly #channel: string
  readonly #peers = new WeakMap<WebContents, ServerPeer>()

  constructor(
    private readonly standardHandler: StandardHandler<T>,
    options: experimental_ElectronIPCHandlerOptions = {},
  ) {
    this.#channel = options.channel ?? DEFAULT_ORPC_HANDLER_CHANNEL
  }

  upgrade(
    ...rest: MaybeOptionalOptions<Omit<FriendlyStandardHandleOptions<T>, 'prefix'>>
  ): void {
    ipcMain.on(this.#channel, async (event, message) => {
      let peer = this.#peers.get(event.sender)

      if (!peer) {
        this.#peers.set(event.sender, peer = new ServerPeer(async (raw) => {
          event.sender.send(this.#channel, raw instanceof Blob ? await raw.arrayBuffer() : raw)
        }))

        event.sender.on('destroyed', () => {
          peer?.close()
          this.#peers.delete(event.sender)
        })
      }

      const [id, request] = await peer.message(message)

      if (!request) {
        return
      }

      const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))

      const { response } = await this.standardHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, options)

      await peer.response(id, response ?? { status: 404, headers: {}, body: 'No procedure matched' })
    })
  }
}
