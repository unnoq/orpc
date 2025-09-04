import { DurableEventIteratorObject } from '@orpc/experimental-durable-event-iterator/durable-object'
import { os } from '@orpc/server'
import * as z from 'zod'

export class ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  publishMessageRPC() {
    return os
      .input(z.object({ message: z.string() }))
      .handler(({ input }) => {
        this.publishEvent(input)
      })
      .callable()
  }
}
