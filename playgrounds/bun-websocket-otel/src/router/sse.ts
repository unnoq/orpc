import { eventIterator, os } from '@orpc/server'
import * as z from 'zod'

export const sse = os
  .input(eventIterator(z.object({ time: z.date() })))
  .output(eventIterator(z.object({ time: z.date() })))
  .handler(async function* ({ input }) {
    yield* input
  })
