import type { z } from 'zod'
import type { UserSchema } from './schemas/user'
import { ORPCError, os } from '@orpc/server'
import { contract } from './contract'

export type ORPCContext = { user?: z.infer<typeof UserSchema>, db: any }

const base = os.context<ORPCContext>().use((input, context, meta) => {
  const start = Date.now()

  meta.onFinish(() => {
    // eslint-disable-next-line no-console
    console.log(`[${meta.path.join('/')}] ${Date.now() - start}ms`)
  })
})

const authMid = base.middleware((input, context, meta) => {
  if (!context.user) {
    throw new ORPCError({
      code: 'UNAUTHORIZED',
    })
  }

  return {
    context: {
      user: context.user,
    },
  }
})

export const pub = base.contract(contract)
export const authed = base.use(authMid).contract(contract)
