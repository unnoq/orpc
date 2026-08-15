import * as z from 'zod'
import type { RouterClient } from '@orpc/server'
import { ORPCError, os } from '@orpc/server'
import type { IncomingHttpHeaders } from 'node:http'

declare function parseJWT(token: string | undefined): { userId: number } | null

export const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
})

export const listPlanet = os
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).optional(),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ input }) => {
    return [{ id: 1, name: 'name' }]
  })

export const findPlanet = os
  .input(PlanetSchema.pick({ id: true }))
  .handler(async ({ input }) => {
    return { id: 1, name: 'name' }
  })

export const createPlanet = os
  .$context<{ headers: IncomingHttpHeaders }>()
  .use(({ context, next }) => {
    const user = parseJWT(context.headers.authorization?.split(' ')[1])

    if (user) {
      return next({ context: { user } })
    }

    throw new ORPCError('UNAUTHORIZED')
  })
  .input(PlanetSchema.omit({ id: true }))
  .handler(async ({ input, context }) => {
    return { id: 1, name: 'name' }
  })

export const router = {
  planet: {
    list: listPlanet,
    find: findPlanet,
    create: createPlanet,
  },
}

export const client = {} as RouterClient<typeof router>
