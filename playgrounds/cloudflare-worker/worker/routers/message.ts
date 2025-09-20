import { DurableIterator } from '@orpc/experimental-durable-iterator'
import { pub } from '../orpc'
import * as z from 'zod'
import type { ChatRoom } from '../dos/chat-room'

export const onMessage = pub.handler(({ context }) => {
  return new DurableIterator<ChatRoom>('some-room', {
    signingKey: 'key',
    tags: ['tag1', 'tag2'],
    tokenTTLSeconds: 60 * 60 * 24, // 24 hours
    att: { some: 'attachment' },
  }).rpc('publishMessageRPC')
})

export const sendMessage = pub
  .input(z.object({ message: z.string() }))
  .handler(async ({ context, input }) => {
    const id = context.env.CHAT_ROOM.idFromName('some-room')
    const stub = context.env.CHAT_ROOM.get(id)

    await stub.publishEvent(input)
  })
