import { DurableEventIteratorObject } from '@orpc/durable-event-iterator/durable-object'
import { os } from '@orpc/server'
import { z } from 'zod'

export class ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  publishMessage() {
    return os
      .input(z.object({ message: z.string() }))
      .handler(({ input }) => {
        this.dei.websocketManager.publishEvent(this.ctx.getWebSockets(), input)
      })
      .callable()
  }
}
