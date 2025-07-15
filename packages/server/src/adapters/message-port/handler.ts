import type { SupportedMessagePort } from '@orpc/client/message-port'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type {
  HandleStandardServerPeerMessageOptions,
} from '../standard-peer'
import { onMessagePortClose, onMessagePortMessage, postMessagePortMessage } from '@orpc/client/message-port'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { ServerPeer } from '@orpc/standard-server-peer'
import {
  handleStandardServerPeerMessage,
} from '../standard-peer'

export class MessagePortHandler<T extends Context> {
  constructor(
    private readonly standardHandler: StandardHandler<T>,
  ) {
  }

  upgrade(
    port: SupportedMessagePort,
    ...rest: MaybeOptionalOptions<HandleStandardServerPeerMessageOptions<T>>
  ): void {
    const peer = new ServerPeer((message) => {
      return postMessagePortMessage(port, message)
    })

    onMessagePortMessage(port, async (message) => {
      await handleStandardServerPeerMessage(
        this.standardHandler,
        peer,
        message,
        resolveMaybeOptionalOptions(rest),
      )
    })

    onMessagePortClose(port, () => {
      peer.close()
    })
  }
}
