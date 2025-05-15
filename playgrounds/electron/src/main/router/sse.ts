import { eventIterator, os } from '@orpc/server'
import { z } from 'zod'

const MAX_EVENTS = 5

export const sse = os
  .route({
    method: 'GET',
    path: '/sse',
    tags: ['SSE'],
    summary: 'Server-Sent Events',
  })
  .output(eventIterator(z.object({ time: z.date() })))
  .handler(async function* () {
    let count = 0

    while (count < MAX_EVENTS) {
      count++
      yield { time: new Date() }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  })
