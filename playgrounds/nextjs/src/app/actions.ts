'use server'

import { os } from '@orpc/server'
import { z } from 'zod'

export const getting = os
  .input(z.object({
    name: z.string(),
  }))
  .output(z.string())
  .handler(async ({ input }) => {
    return `Hello ${input.name}`
  })
  .actionable()
