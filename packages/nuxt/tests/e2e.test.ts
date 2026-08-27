import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { createApp, toNodeListener } from 'h3'
import request from 'supertest'
import { defineORPCEventHandler } from '../src/h3'
import { handler, orpc } from './__shared__/orpc'

describe('nuxt utils', () => {
  it('fetches through the real client', async () => {
    const [key, fetch] = orpc.static.asyncDataArgs({ input: { input: 42 } })

    expect(key.value).toBe(orpc.static.key({ input: { input: 42 } }))
    await expect(fetch()).resolves.toEqual({ output: '42' })
  })

  it('matches generated keys with matchers', () => {
    const [key] = orpc.nested.static.asyncDataArgs({ input: { input: 1 } })

    expect(orpc.matcher()(key.value)).toBe(true)
    expect(orpc.nested.matcher()(key.value)).toBe(true)
    expect(orpc.nested.static.matcher()(key.value)).toBe(true)
    expect(orpc.nested.static.matcher({ input: { input: 1 } })(key.value)).toBe(true)
    expect(orpc.nested.static.matcher({ input: { input: 2 } })(key.value)).toBe(false)
    expect(orpc.static.matcher()(key.value)).toBe(false)
  })
})

describe('defineORPCEventHandler with h3 v1', () => {
  it('serves an oRPC handler inside an h3 app', async () => {
    const app = createApp()
    app.use(defineORPCEventHandler(handler, { prefix: '/rpc' }))

    const res = await request(toNodeListener(app))
      .post('/rpc/static')
      .set('content-type', 'application/json')
      .send({ json: { input: 42 } })

    expect(res.status).toBe(200)
    expect(res.body.json).toEqual({ output: '42' })
  })

  it('responds 404 for unmatched requests', async () => {
    const app = createApp()
    app.use(defineORPCEventHandler(handler, { prefix: '/rpc' }))

    const res = await request(toNodeListener(app))
      .post('/rpc/unknown')
      .set('content-type', 'application/json')
      .send({ json: null })

    expect(res.status).toBe(404)
  })

  it('resolves the context from the event', async () => {
    const contextHandler = new RPCHandler({
      whoami: os.$context<{ user: string | undefined }>().handler(({ context }) => context.user),
    })

    const app = createApp()
    app.use(defineORPCEventHandler(contextHandler, {
      context: async event => ({ user: event.node.req.headers['x-user'] as string | undefined }),
    }))

    const res = await request(toNodeListener(app))
      .post('/whoami')
      .set('content-type', 'application/json')
      .set('x-user', '__user__')
      .send({ json: null })

    expect(res.status).toBe(200)
    expect(res.body.json).toBe('__user__')
  })
})
