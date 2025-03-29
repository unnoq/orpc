'use server'

import { pub } from '@/orpc'
import { z } from 'zod'
import { createFormAction } from '@orpc/react/server'
import { redirect } from 'next/navigation'
import { onSuccess } from '@orpc/client'

export const getting = pub
  .input(z.object({
    name: z.string(),
  }))
  .output(z.string())
  .handler(async ({ input }) => {
    return `Hello ${input.name}!`
  })
  .actionable()

const dosomething = pub
  .input(z.object({
    user: z.object({
      name: z.string(),
      age: z.coerce.number(),
    }),
  }))
  .handler(({ input }) => {
    console.log('An form action was called!')
    console.log(input)
  })

export const redirectToScalarForm = createFormAction(dosomething, {
  interceptors: [
    onSuccess(async () => {
      redirect('/scalar')
    }),
  ],
})
