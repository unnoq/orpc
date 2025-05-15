import type { User } from '../schemas/user'
import { os } from '@orpc/server'

export const requiredAuthMiddleware = os
  .$context<{ session?: { user?: User } }>()
  .middleware(async ({ context, next }) => {
    /**
     * Why we should ?? here?
     * Because it can avoid `getSession` being called when unnecessary.
     * {@link https://orpc.unnoq.com/docs/best-practices/dedupe-middleware}
     */
    const session = context.session ?? await getSession()

    if (!session.user) {
      throw new Error('UNAUTHORIZED')
    }

    return next({
      context: { user: session.user },
    })
  })

async function getSession() {
  return { user: { id: 'unique', name: 'unnoq', email: 'contact@unnoq.com' } }
}
