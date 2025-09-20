import { DURABLE_ITERATOR_ID_PARAM, DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { signDurableIteratorToken } from '../schemas'
import { upgradeDurableIteratorRequest } from './upgrade'

describe('upgradeDurableIteratorRequest', () => {
  it('reject non-websocket upgrade', async () => {
    const response = await upgradeDurableIteratorRequest(
      new Request('https://example.com'),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(426)
  })

  it('rejects missing client id', async () => {
    const token = await signDurableIteratorToken('signing-key', {
      chn: 'test-channel',
      rpc: ['someMethod'],
      att: { some: 'attachment' },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 1000,
    })

    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, token)

    const response = await upgradeDurableIteratorRequest(
      new Request(url, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects missing token', async () => {
    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'client-id')

    const response = await upgradeDurableIteratorRequest(
      new Request(url, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid token', async () => {
    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, 'invalid')
    url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'client-id')

    const response = await upgradeDurableIteratorRequest(
      new Request(url, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid payload', async () => {
    const invalidToken = await signDurableIteratorToken('test-sign', {} as any)
    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, invalidToken)
    url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'client-id')

    const response = await upgradeDurableIteratorRequest(
      new Request(url, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('upgrades valid request', async () => {
    const namespace = {
      idFromName: vi.fn((name: string) => new TextEncoder().encode(name)),
      get: vi.fn(() => ({
        fetch: vi.fn(() => new Response('WebSocket Upgrade Successful')),
      })),
    }

    const token = await signDurableIteratorToken('signing-key', {
      chn: 'test-channel',
      rpc: ['someMethod'],
      att: { some: 'attachment' },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 1000,
    })

    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, token)
    url.searchParams.set(DURABLE_ITERATOR_ID_PARAM, 'test-id')

    const request = new Request(url, {
      headers: { upgrade: 'websocket' },
    })
    const response = await upgradeDurableIteratorRequest(
      request,
      {
        namespace: namespace as any,
        signingKey: 'signing-key',
      },
    )

    expect(await response.text()).toEqual('WebSocket Upgrade Successful')

    expect(namespace.idFromName).toHaveBeenCalledWith('test-channel')
    expect(namespace.get).toHaveBeenCalledWith(namespace.idFromName.mock.results[0]!.value)

    const stub = namespace.get.mock.results[0]!.value
    expect(stub.fetch).toHaveBeenCalledOnce()
    expect(stub.fetch).toHaveBeenCalledWith(request)
  })
})
