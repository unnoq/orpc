import type { DurableIteratorTokenPayload } from '../schemas'
import { os } from '@orpc/server'
import { sleep } from '@orpc/shared'
import { encodeRequestMessage, encodeResponseMessage, MessageType } from '@orpc/standard-server-peer'
import { createCloudflareWebsocket, createDurableObjectState } from '../../tests/shared'
import { DURABLE_ITERATOR_ID_PARAM, DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { signDurableIteratorToken } from '../schemas'
import { DurableIteratorObject } from './object'
import { toDurableIteratorWebsocket } from './websocket'

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(
      protected readonly ctx: any,
      protected readonly env: unknown,
    ) { }
  },
}))

beforeAll(() => {
  (globalThis as any).WebSocketPair = vi.fn(() => ({
    0: createCloudflareWebsocket(),
    1: createCloudflareWebsocket(),
  }))

  const globalResponse = globalThis.Response

    ; (globalThis as any).Response = class extends globalResponse {
    readonly __init: any

    constructor(input: any, init?: any) {
      super(input, {
        ...init,
        status: 200, // avoid invalid status error
      })

      this.__init = init
    }
  }

  afterAll(() => {
    ; (globalThis as any).WebSocketPair = undefined
    ; (globalThis as any).Response = globalResponse
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('class DurableIteratorObject & DurableIteratorObjectHandler', async () => {
  const ctx = createDurableObjectState()
  const env = {}
  const onSubscribed = vi.fn()

  const object = new DurableIteratorObject(ctx, env, { signingKey: 'secret', onSubscribed })

  const resumeStoreStoreSpy = vi.spyOn((object['~orpc'] as any).resumeStorage, 'store')
  const resumeStoreGetSpy = vi.spyOn((object['~orpc'] as any).resumeStorage, 'get')

  const baseTokenPayload = {
    chn: 'channel',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    att: 'att',
    rpc: ['method'],
    tags: ['tag1', 'tag2'],
  } satisfies DurableIteratorTokenPayload

  it('throw if not passed 3rd argument', () => {
    expect(() => new (DurableIteratorObject as any)(ctx, env)).toThrow('Missing options')
  })

  it('auto close expired websockets on init', async () => {
    const wsNormal = createCloudflareWebsocket()
    toDurableIteratorWebsocket(wsNormal)['~orpc'].serializeTokenPayload(baseTokenPayload)
    const wsExpired = createCloudflareWebsocket()
    toDurableIteratorWebsocket(wsExpired)['~orpc'].serializeTokenPayload({ ...baseTokenPayload, exp: Math.floor(Date.now() / 1000) - 3600 })

    ctx.getWebSockets.mockReturnValue([wsNormal, wsExpired])
    void new DurableIteratorObject(ctx, env, { signingKey: 'secret' })

    expect(wsNormal.close).toHaveBeenCalledTimes(0)
    expect(wsExpired.close).toHaveBeenCalledTimes(1)
  })

  describe('publishEvent', () => {
    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeId('ws-1')
    ws1['~orpc'].serializeTokenPayload(baseTokenPayload)
    ws1['~orpc'].serializeHibernationId('1')

    const ws2 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws2['~orpc'].serializeId('ws-2')
    ws2['~orpc'].serializeTokenPayload(baseTokenPayload)
    ws2['~orpc'].serializeHibernationId('1')

    it('works', async () => {
      const wsMissingHibernationId = toDurableIteratorWebsocket(createCloudflareWebsocket())
      wsMissingHibernationId['~orpc'].serializeId('wsMissingHibernationId')
      wsMissingHibernationId['~orpc'].serializeTokenPayload(baseTokenPayload)

      ctx.getWebSockets.mockReturnValue([ws1, ws2, wsMissingHibernationId])

      resumeStoreStoreSpy.mockReturnValue({ order: '__fromResumeStore__' })
      object.publishEvent({ order: 1 })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(wsMissingHibernationId['~orpc'].original.send).toHaveBeenCalledTimes(0)

      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 1 }, {})

      // send result from resume store
      expect((ws1 as any)['~orpc'].original.send.mock.calls[0][0]).toContain(JSON.stringify({ order: '__fromResumeStore__' }))
      expect((ws2 as any)['~orpc'].original.send.mock.calls[0][0]).toContain(JSON.stringify({ order: '__fromResumeStore__' }))
    })

    it('targets, exclude options', async () => {
      ctx.getWebSockets.mockReturnValue([ws1, ws2])

      object.publishEvent({ order: 1 }, { targets: [ws1] })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(0)
      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 1 }, { targets: [ws1] })

      vi.clearAllMocks()
      object.publishEvent({ order: 2 }, { exclude: [ws1] })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(0)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 2 }, { exclude: [ws1] })

      vi.clearAllMocks()
      object.publishEvent({ order: 3 }, { targets: [ws1], exclude: [ws2] })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(0)
      expect(resumeStoreStoreSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreStoreSpy).toHaveBeenCalledWith({ order: 3 }, { targets: [ws1], exclude: [ws2] })
    })

    it('ignore sending errors', async () => {
      ctx.getWebSockets.mockReturnValue([ws1, ws2])

      vi.mocked(ws1['~orpc'].original.send).mockImplementationOnce(() => {
        throw new Error('error')
      })

      object.publishEvent({ order: 1 })

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
      expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
    })
  })

  describe('upgrade websocket connection', async () => {
    it('with tags', async () => {
      const token = await signDurableIteratorToken('secret', baseTokenPayload)

      const url = new URL('https://example.com')
      url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, token)
      url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'some-id')

      const response = await object.fetch(new Request(url))

      expect((globalThis as any).WebSocketPair).toHaveBeenCalledTimes(1)
      const { 0: client, 1: server } = (globalThis as any).WebSocketPair.mock.results[0].value
      expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(1)
      expect(ctx.acceptWebSocket).toHaveBeenCalledWith(server, ['tag1', 'tag2'])

      expect(response).instanceOf(Response)
      expect((response as any).__init.status).toBe(101)
      expect((response as any).__init.webSocket).toBe(client)

      expect(toDurableIteratorWebsocket(server)['~orpc'].deserializeTokenPayload()).toEqual(baseTokenPayload)
    })

    it('without tags', async () => {
      const payload = { ...baseTokenPayload, tags: undefined }
      const token = await signDurableIteratorToken('secret', payload)

      const url = new URL('https://example.com')
      url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, token)
      url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'some-id')

      const response = await object.fetch(new Request(url))

      expect((globalThis as any).WebSocketPair).toHaveBeenCalledTimes(1)
      const { 0: client, 1: server } = (globalThis as any).WebSocketPair.mock.results[0].value
      expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(1)
      expect(ctx.acceptWebSocket).toHaveBeenCalledWith(server)

      expect(response).instanceOf(Response)
      expect((response as any).__init.status).toBe(101)
      expect((response as any).__init.webSocket).toBe(client)

      expect(toDurableIteratorWebsocket(server)['~orpc'].deserializeTokenPayload()).toEqual(payload)
    })

    it('reject if missing id', async () => {
      const token = await signDurableIteratorToken('secret', baseTokenPayload)
      const url = new URL('https://example.com')
      url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, token)

      const response = await object.fetch(new Request(url))

      expect((globalThis as any).WebSocketPair).toHaveBeenCalledTimes(0)
      expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(0)

      expect(response).instanceOf(Response)
      expect((response as any).__init.status).toBe(401)
    })

    it('reject if missing token', async () => {
      const url = new URL('https://example.com')
      url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'some-id')
      const response = await object.fetch(new Request(url))

      expect((globalThis as any).WebSocketPair).toHaveBeenCalledTimes(0)
      expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(0)

      expect(response).instanceOf(Response)
      expect((response as any).__init.status).toBe(401)
    })

    it('reject if invalid token', async () => {
      const url = new URL('https://example.com')
      url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, 'invalid')
      url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'some-id')

      const response = await object.fetch(new Request(url))

      expect((globalThis as any).WebSocketPair).toHaveBeenCalledTimes(0)
      expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(0)

      expect(response).instanceOf(Response)
      expect((response as any).__init.status).toBe(401)
    })
  })

  it('auto close if expired on every websocket message arrive', async () => {
    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeTokenPayload({ ...baseTokenPayload, exp: -1 })
    vi.mocked(ws1['~orpc'].original.close).mockImplementationOnce(() => {
      (ws1 as any).readyState = WebSocket.CLOSING
    })

    await object.webSocketMessage(ws1, 'message')
    expect(ws1['~orpc'].original.close).toHaveBeenCalledTimes(1)
  })

  describe('update token', () => {
    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeTokenPayload({ ...baseTokenPayload, rpc: ['signalClient'] })

    it('works', async () => {
      const payload1 = { ...baseTokenPayload, rpc: ['rpc-1'] }
      const token1 = await signDurableIteratorToken('secret', payload1)

      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/updateToken'),
        body: { json: { token: token1 } },
        headers: { },
        method: 'POST',
      }))

      expect(ws1['~orpc'].original.send).toHaveBeenCalledWith(expect.toSatisfy((s: string) => {
        return !s.includes('"code"') // code only exists in reject message
      }))
      expect(ws1['~orpc'].deserializeTokenPayload()).toEqual(payload1)
      expect((ws1 as any)['~orpc'].original.serializeAttachment).toHaveBeenCalledTimes(1)
    })

    it('reject if invalid token', async () => {
      const token = 'invalid'
      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/updateToken'),
        body: { json: { token } },
        headers: { },
        method: 'POST',
      }))

      expect(ws1['~orpc'].original.send).toHaveBeenCalledWith(expect.toSatisfy((s: string) => {
        return s.includes('"code":"UNAUTHORIZED"')
      }))
      expect((ws1 as any)['~orpc'].original.serializeAttachment).toHaveBeenCalledTimes(0)
    })

    it('reject if mismatched channel', async () => {
      const payload = { ...baseTokenPayload, chn: 'a-different-one' }
      const token = await signDurableIteratorToken('secret', payload)

      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/updateToken'),
        body: { json: { token } },
        headers: {},
        method: 'POST',
      }))

      expect(ws1['~orpc'].original.send).toHaveBeenCalledWith(expect.toSatisfy((s: string) => {
        return s.includes('"code":"UNAUTHORIZED"')
      }))
      expect((ws1 as any)['~orpc'].original.serializeAttachment).toHaveBeenCalledTimes(0)
    })

    it('reject if mismatched tags', async () => {
      const payload = { ...baseTokenPayload, tags: ['a-different-one'] }
      const token = await signDurableIteratorToken('secret', payload)

      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/updateToken'),
        body: { json: { token } },
        headers: {},
        method: 'POST',
      }))

      expect(ws1['~orpc'].original.send).toHaveBeenCalledWith(expect.toSatisfy((s: string) => {
        return s.includes('"code":"UNAUTHORIZED"')
      }))
      expect((ws1 as any)['~orpc'].original.serializeAttachment).toHaveBeenCalledTimes(0)
    })
  })

  describe('subscribe', () => {
    const event1 = { order: 1 }
    const event2 = { order: 2 }

    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeTokenPayload({ ...baseTokenPayload, rpc: ['signalClient'] })

    it('works and resume events', async () => {
      resumeStoreGetSpy.mockReturnValue([event1, event2])

      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/subscribe'),
        body: {},
        headers: { 'last-event-id': '1' },
        method: 'POST',
      }))

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(3) // 1 for response, 2 for events

      expect(ws1['~orpc'].original.send).toHaveBeenNthCalledWith(2, expect.toSatisfy((s: string) => {
        return s.includes('"order":1')
      }))
      expect(ws1['~orpc'].original.send).toHaveBeenNthCalledWith(3, expect.toSatisfy((s: string) => {
        return s.includes('"order":2')
      }))

      expect(resumeStoreGetSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreGetSpy).toHaveBeenCalledWith(ws1, '1')
    })

    it('ignore resume sending errors', async () => {
      resumeStoreGetSpy.mockReturnValue([event1, event2])

      let time = 0
      vi.mocked(ws1['~orpc'].original.send).mockImplementation(() => {
        time++
        if (time >= 2) {
          throw new Error('error')
        }
      })

      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/subscribe'),
        body: {},
        headers: { 'last-event-id': '1' },
        method: 'POST',
      }))

      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(2) // 1 for response, 1 for events (step when error occurs)

      // resumeStoreGetSpy is called -> error from .send is ignored
      expect(resumeStoreGetSpy).toHaveBeenCalledTimes(1)
      expect(resumeStoreGetSpy).toHaveBeenCalledWith(ws1, '1')
    })
  })

  describe('rpc', () => {
    const singleClientHandler = vi.fn(async () => '__singleClientHandlerOutput__')
    const singleClient = vi.fn(() => os.handler(singleClientHandler).callable())

    const nestedClientHandler = vi.fn(async () => '__nestedClientHandlerOutput__')
    const nestedClient = vi.fn(() => ({ nested: { nested: os.handler(nestedClientHandler).callable() } }))

    class TestObject extends DurableIteratorObject<object> {
      signalClient = singleClient
      nestedClient = nestedClient
    }
    const interceptor = vi.fn(({ next }) => next())
    const object = new TestObject(ctx, env, { signingKey: 'secret', interceptors: [interceptor] })

    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeTokenPayload({ ...baseTokenPayload, rpc: ['signalClient'] })
    const ws2 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws2['~orpc'].serializeTokenPayload({ ...baseTokenPayload, rpc: ['nestedClient'] })

    it('work with single client', async () => {
      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/call'),
        body: { json: { path: ['signalClient'], input: '__input__' } },
        headers: { 'last-event-id': '__lastEventId__' },
        method: 'POST',
      }))

      await vi.waitFor(async () => {
        expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
        expect(ws1['~orpc'].original.send).toHaveBeenCalledWith(await encodeResponseMessage('id1', MessageType.RESPONSE, {
          body: { json: '__singleClientHandlerOutput__' },
          headers: {},
          status: 200,
        }))
      })

      expect(singleClient).toHaveBeenCalledTimes(1)
      expect(singleClient).toHaveBeenCalledWith(ws1)

      expect(singleClientHandler).toHaveBeenCalledTimes(1)
      expect(singleClientHandler).toHaveBeenCalledWith(expect.objectContaining({
        input: '__input__',
        signal: expect.any(AbortSignal),
        lastEventId: '__lastEventId__',
      }))
      expect(interceptor).toHaveBeenCalledTimes(1)
    })

    it('work with nested client', async () => {
      await object.webSocketMessage(ws2, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/call'),
        body: { json: { path: ['nestedClient', 'nested', 'nested'], input: '__input__' } },
        headers: { 'last-event-id': '__lastEventId__' },
        method: 'POST',
      }))

      await vi.waitFor(async () => {
        expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
        expect(ws2['~orpc'].original.send).toHaveBeenCalledWith(await encodeResponseMessage('id1', MessageType.RESPONSE, {
          body: { json: '__nestedClientHandlerOutput__' },
          headers: {},
          status: 200,
        }))
      })

      expect(nestedClient).toHaveBeenCalledTimes(1)
      expect(nestedClient).toHaveBeenCalledWith(ws2)

      expect(nestedClientHandler).toHaveBeenCalledTimes(1)
      expect(nestedClientHandler).toHaveBeenCalledWith(expect.objectContaining({
        input: '__input__',
        signal: expect.any(AbortSignal),
        lastEventId: '__lastEventId__',
      }))
      expect(interceptor).toHaveBeenCalledTimes(1)
    })

    it('require have required permissions to call', async () => {
      await object.webSocketMessage(ws2, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/call'),
        body: { json: { path: ['signalClient'], input: '__input__' } },
        headers: {},
        method: 'POST',
      }))

      await vi.waitFor(async () => {
        expect(ws2['~orpc'].original.send).toHaveBeenCalledTimes(1)
        expect(ws2['~orpc'].original.send).toHaveBeenCalledWith(expect.toSatisfy((s: string) => {
          return s.includes('"code":"FORBIDDEN"')
        }))
      })

      expect(singleClient).toHaveBeenCalledTimes(0)
      expect(singleClientHandler).toHaveBeenCalledTimes(0)
      expect(interceptor).toHaveBeenCalledTimes(1)
    })

    it('throw on not found corresponding client', async () => {
      await object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/call'),
        body: { json: { path: ['signalClient', 'notFound'], input: '__input__' } },
        headers: {},
        method: 'POST',
      }))

      await vi.waitFor(async () => {
        expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(1)
        expect(ws1['~orpc'].original.send).toHaveBeenCalledWith(expect.toSatisfy((s: string) => {
          return s.includes('"code":"INTERNAL_SERVER_ERROR"')
        }))
      })

      expect(singleClient).toHaveBeenCalledTimes(1)
      expect(singleClientHandler).toHaveBeenCalledTimes(0)
      expect(interceptor).toHaveBeenCalledTimes(1)
    })

    it('websocket message/close use the same reference - abort signal if websocket close', async () => {
      singleClientHandler.mockImplementationOnce(async () => {
        await sleep(1000)
        return '__output__'
      })

      const promise = object.webSocketMessage(ws1, await encodeRequestMessage('id1', MessageType.REQUEST, {
        url: new URL('http://localhost/call'),
        body: { json: { path: ['signalClient'], input: '__input__' } },
        headers: {},
        method: 'POST',
      }))

      await sleep(100)
      expect(singleClientHandler).toHaveBeenCalledTimes(1)
      const signal = (singleClientHandler as any).mock.calls[0][0].signal
      expect(signal).instanceOf(AbortSignal)
      expect(signal.aborted).toBe(false)

      // use original here to check if the websocket can reference the same reference or not?
      await object.webSocketClose(ws1['~orpc'].original, 1000, 'closed', true)
      await sleep(100)
      expect(signal.aborted).toBe(true)

      await promise
      expect(ws1['~orpc'].original.send).toHaveBeenCalledTimes(0) // closed so not send anymore
    })
  })
})
