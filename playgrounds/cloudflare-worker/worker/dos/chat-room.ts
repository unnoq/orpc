import { DurableIteratorObject } from '@orpc/experimental-durable-iterator/durable-object'
import { onError, os } from '@orpc/server'
import * as z from 'zod'

export class ChatRoom extends DurableIteratorObject<{ message: string }> {
  constructor(
    ctx: DurableObjectState,
    env: Env,
  ) {
    super(ctx, env, {
      resumeRetentionSeconds: 60 * 2, // 2 minutes
      interceptors: [
        onError(e => console.error(e)), // log error thrown from rpc calls
      ],
    })
  }

  publishMessageRPC() {
    return os
      .input(z.object({ message: z.string() }))
      .handler(({ input }) => {
        this.publishEvent(input)
      })
      .callable()
  }
}
