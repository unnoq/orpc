import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import { toORPCError } from '@orpc/client'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'
import { stringifyJSON } from '@orpc/shared'
import { getEventMeta } from '@orpc/standard-server'
import { MessageType } from '@orpc/standard-server-peer'

export interface EncodeHibernationRPCEventOptions extends StandardRPCJsonSerializerOptions {
  /**
   * The type of event, each type corresponds a different operation
   *
   * - 'message' = 'yield'
   * - 'error' = 'throw'
   * - 'done' = 'return'
   *
   * @default 'message'
   */
  event?: 'message' | 'error' | 'done'
}

/**
 * Encodes a Hibernation RPC Event
 *
 * @see {@link https://orpc.dev/docs/plugins/hibernation Hibernation Plugin}
 */
export function encodeHibernationRPCEvent(
  id: string,
  payload: unknown,
  options: EncodeHibernationRPCEventOptions = {},
): string {
  const { event = 'message', ...rest } = options

  const serializer = new StandardRPCJsonSerializer(rest)

  const data = event === 'error' ? toORPCError(payload).toJSON() : payload

  const [json, meta] = serializer.serialize(data)

  return stringifyJSON({
    i: id,
    t: MessageType.EVENT_ITERATOR,
    p: {
      e: event,
      d: { json, meta: meta.length > 0 ? meta : undefined },
      m: getEventMeta(payload),
    },
  })
}
