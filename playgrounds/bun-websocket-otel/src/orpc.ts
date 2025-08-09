import { os } from '@orpc/server'
import { dbProviderMiddleware } from './middlewares/db'
import { requiredAuthMiddleware } from './middlewares/auth'

export const pub = os
  .use(dbProviderMiddleware)

export const authed = pub
  .use(requiredAuthMiddleware)
