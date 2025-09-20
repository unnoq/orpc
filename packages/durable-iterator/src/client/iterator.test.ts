import { AsyncIteratorClass, isAsyncIteratorObject } from '@orpc/shared'
import { signDurableIteratorToken } from '../schemas'
import { createClientDurableIterator, getClientDurableIteratorToken } from './iterator'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createClientDurableIterator', async () => {
  const token = await signDurableIteratorToken('some-secret-key', {
    id: 'some-id',
    chn: 'some-channel',
    rpc: ['method1', 'method2'],
    att: { some: 'claims' },
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })

  const getToken = vi.fn(() => token)

  const next = vi.fn(() => Promise.resolve({ value: '__next__', done: false }))
  const cleanup = vi.fn(() => Promise.resolve())
  const call = vi.fn(() => Promise.resolve('__call__'))

  const iterator = createClientDurableIterator(new AsyncIteratorClass<any>(next, cleanup), {
    call,
  }, {
    getToken,
  })

  it('is an async iterator with durable iterator token', async () => {
    expect(iterator).toSatisfy(isAsyncIteratorObject)

    expect(await iterator.next()).toEqual({ value: '__next__', done: false })
    expect(next).toHaveBeenCalledTimes(1)

    expect(await iterator.return()).toEqual({ value: undefined, done: true })
    expect(cleanup).toHaveBeenCalledTimes(1)

    expect(getClientDurableIteratorToken(iterator)).toEqual(token)
  })

  it('has methods from the token', async () => {
    expect(iterator.method1).toBeInstanceOf(Function)
    expect(iterator.method2).toBeInstanceOf(Function)
    expect(iterator.random).not.toBeDefined()

    await expect((iterator as any).method1('value1', { context: { context1: true } })).resolves.toEqual('__call__')
    await expect((iterator as any).method2.nested.ping('value2')).resolves.toEqual('__call__')

    expect(call).toHaveBeenCalledTimes(2)
    expect(call).toHaveBeenNthCalledWith(1, ['method1'], 'value1', { context: { context1: true } })
    expect(call).toHaveBeenNthCalledWith(2, ['method2', 'nested', 'ping'], 'value2', { context: {} })

    expect(getToken).toHaveBeenCalledTimes(5)
  })

  it('support dynamic token', async () => {
    expect(iterator.method1).toBeInstanceOf(Function)
    expect(iterator.method2).toBeInstanceOf(Function)
    expect(getClientDurableIteratorToken(iterator)).toEqual(token)

    const token2 = await signDurableIteratorToken('some-secret-key', {
      id: 'id-2',
      chn: 'channel-2',
      rpc: ['method2'],
      att: { some: 'claims' },
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })

    getToken.mockReturnValue(token2)

    expect(iterator.method1).not.toBeInstanceOf(Function) // token 2 not have method1
    expect(iterator.method2).toBeInstanceOf(Function)
    expect(getClientDurableIteratorToken(iterator)).toEqual(token2)
  })
})
