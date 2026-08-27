import type { H3Event } from 'h3'
import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { defineORPCEventHandler } from './event-handler'

describe('defineORPCEventHandler', () => {
  const optionalContextHandler = new RPCHandler({
    ping: os.handler(() => 'pong'),
  })

  const requiredContextHandler = new RPCHandler({
    whoami: os.$context<{ user: string }>().handler(({ context }) => context.user),
  })

  it('options are optional when the context is optional', () => {
    defineORPCEventHandler(optionalContextHandler)
    defineORPCEventHandler(optionalContextHandler, {})
    defineORPCEventHandler(optionalContextHandler, { prefix: '/rpc' })
  })

  it('requires the context when it is required', () => {
    // @ts-expect-error - `context` is required
    defineORPCEventHandler(requiredContextHandler)
    // @ts-expect-error - `context` is required
    defineORPCEventHandler(requiredContextHandler, { prefix: '/rpc' })

    defineORPCEventHandler(requiredContextHandler, { context: { user: '__user__' } })
    defineORPCEventHandler(requiredContextHandler, {
      context: (event) => {
        expectTypeOf(event).toEqualTypeOf<H3Event>()
        return { user: '__user__' }
      },
    })
    defineORPCEventHandler(requiredContextHandler, { context: async () => ({ user: '__user__' }) })

    // @ts-expect-error - invalid context type
    defineORPCEventHandler(requiredContextHandler, { context: { user: 123 } })
  })

  it('validates the prefix', () => {
    // @ts-expect-error - prefix must start with /
    defineORPCEventHandler(optionalContextHandler, { prefix: 'rpc' })
  })
})
