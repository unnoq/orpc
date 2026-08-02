import type { Public } from '@orpc/shared'
import type { EncodePeerMessageOptions, PeerEventStreamMessage } from '@standardserver/peer'
import { RPCSerializer, toORPCError } from '@orpc/client'
import { unwrapEvent } from '@standardserver/core'
import { encodePeerMessage } from '@standardserver/peer'

export interface EncodeHibernationRPCEventOptions {
  /**
   * Options for encoding peer messages. such as `prefix` for distinguishing messages on the same channel..
   */
  encodePeerMessage?: EncodePeerMessageOptions | undefined

  /**
   * Override the default RPC serializer.
   */
  serializer?: Public<RPCSerializer>

  /**
   * The type of event, each type corresponds a different operation
   *
   * - 'message' = 'yield'
   * - 'error' = 'throw'
   * - 'close' = 'return'
   *
   * @default 'message'
   */
  event?: 'message' | 'error' | 'close'
}

/**
 * Encodes a Hibernation RPC Event
 *
 * @see {@link https://orpc.dev/docs/plugins/hibernation Hibernation Plugin}
 */
export async function encodeHibernationRPCEvent(
  id: string,
  payload: unknown,
  { event = 'message', serializer = new RPCSerializer(), encodePeerMessage: encodePeerMessageOptions }: EncodeHibernationRPCEventOptions = {},
): Promise<string | Uint8Array<ArrayBuffer>> {
  const [originalData, meta] = unwrapEvent(payload)
  const data = event === 'error' ? toORPCError(originalData).toJSON() : originalData

  const message: PeerEventStreamMessage = {
    kind: 'event-stream',
    id,
    json: {
      ...meta,
      event: event === 'message' ? undefined : event,
      data: serializer.serialize(data, { useFormDataForBlobFields: false }),
    },
  }

  return encodePeerMessage(message, encodePeerMessageOptions)
}
