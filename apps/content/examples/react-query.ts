import type { router } from 'examples/server'
import { createORPCReactQueryUtils } from '@orpc/react-query'

export const orpc = createORPCReactQueryUtils<typeof router /** or contract router */>('fake-client' as any)
