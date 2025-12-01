import { ORPCError } from '@orpc/server'
import * as z from 'zod'
import { authed, pub } from '../orpc'
import { NewPlanetSchema, PlanetSchema, UpdatePlanetSchema } from '../schemas/planet'
import { retry } from '~/middlewares/retry'

export const listPlanets = pub
  .use(retry({ times: 3 }))
  .route({
    method: 'GET',
    path: '/planets',
    summary: 'List all planets',
    tags: ['Planets'],
  })
  .input(
    z.object({
      limit: z.number().int().min(1).max(100).default(10),
      cursor: z.number().int().min(0).default(0),
    }),
  )
  .output(z.array(PlanetSchema))
  .handler(async ({ input, context }) => {
    return context.db.planets.list(input.limit, input.cursor)
  })

export const createPlanet = authed
  .route({
    method: 'POST',
    path: '/planets',
    summary: 'Create a planet',
    tags: ['Planets'],
  })
  .input(NewPlanetSchema)
  .output(PlanetSchema)
  .handler(async ({ input, context }) => {
    return context.db.planets.create(input, context.user)
  })

export const findPlanet = pub
  .use(retry({ times: 3 }))
  .route({
    method: 'GET',
    path: '/planets/{id}',
    summary: 'Find a planet',
    tags: ['Planets'],
  })
  .input(
    z.object({
      id: z.number().int().min(1),
    }),
  )
  .output(PlanetSchema)
  .handler(async ({ input, context }) => {
    const planet = await context.db.planets.find(input.id)

    if (!planet) {
      throw new ORPCError('NOT_FOUND', { message: 'Planet not found' })
    }

    return planet
  })

export const updatePlanet = authed
  .route({
    method: 'PUT',
    path: '/planets/{id}',
    summary: 'Update a planet',
    tags: ['Planets'],
  })
  .errors({
    NOT_FOUND: {
      message: 'Planet not found',
      data: z.object({ id: UpdatePlanetSchema.shape.id }),
    },
  })
  .input(UpdatePlanetSchema)
  .output(PlanetSchema)
  .handler(async ({ input, context, errors }) => {
    const planet = await context.db.planets.find(input.id)

    if (!planet) {
      /**
       *  1. Type-Safe Error Handling
       *
       * {@link https://orpc.dev/docs/error-handling#type%E2%80%90safe-error-handling}
       */
      throw errors.NOT_FOUND({ data: { id: input.id } })

      /**
       * 2. Normal Approach
       *
       * {@link https://orpc.dev/docs/error-handling#normal-approach}
       */
      // throw new ORPCError('NOT_FOUND', { message: 'Planet not found' })
    }

    return context.db.planets.update(input)
  })
