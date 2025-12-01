import { ORPCError } from '@orpc/server'
import { authed, pub } from '../orpc'
import { retry } from '../middlewares/retry'

export const listPlanets = pub
  .use(retry({ times: 3 }))
  .planet
  .list
  .handler(async ({ input, context }) => {
    return context.db.planets.list(input.limit, input.cursor)
  })

export const createPlanet = authed
  .planet
  .create
  .handler(async ({ input, context }) => {
    return context.db.planets.create(input, context.user)
  })

export const findPlanet = pub
  .use(retry({ times: 3 }))
  .planet
  .find
  .handler(async ({ input, context }) => {
    const planet = await context.db.planets.find(input.id)

    if (!planet) {
      throw new ORPCError('NOT_FOUND', { message: 'Planet not found' })
    }

    return planet
  })

export const updatePlanet = authed
  .planet
  .update
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
