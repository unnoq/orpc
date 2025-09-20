import { sleep } from '@orpc/shared'
import { createCloudflareWebsocket } from '../../tests/shared'
import { DurableIteratorError } from '../error'
import { toDurableIteratorWebsocket } from './websocket'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toDurableIteratorWebsocket', () => {
  const ws = createCloudflareWebsocket()
  const proxied = toDurableIteratorWebsocket(ws) as any

  it('proxy with additional ~orpc', () => {
    expect('readyState' in proxied).toBe(true)
    expect(proxied.readyState).toBeTypeOf('number')

    expect('close' in proxied).toBe(true)
    expect(proxied.close).toBeInstanceOf(Function)

    expect('~orpc' in proxied).toBe(true)
    expect(proxied['~orpc']).toBeInstanceOf(Object)
    expect(proxied['~orpc'].original).toBe(ws)
  })

  it('proxy and provide attachment helpers', () => {
    proxied.serializeAttachment('attachment')
    expect(proxied.deserializeAttachment()).toEqual('attachment')
    expect(ws.deserializeAttachment()).toEqual({ wa: 'attachment' })

    proxied['~orpc'].serializeHibernationId('some-id')
    expect(proxied['~orpc'].deserializeHibernationId()).toEqual('some-id')
    expect(ws.deserializeAttachment()).toEqual({ hi: 'some-id', wa: 'attachment' })

    proxied.serializeAttachment({ v: 1 }) // change attachment not accidentally override others
    expect(proxied.deserializeAttachment()).toEqual({ v: 1 })
    expect(ws.deserializeAttachment()).toEqual({ hi: 'some-id', wa: { v: 1 } })

    expect(() => proxied['~orpc'].deserializeId()).toThrow(
      new DurableIteratorError('ID not found, please call serializeId first'),
    )
    proxied['~orpc'].serializeId('some-id')
    expect(proxied['~orpc'].deserializeId()).toEqual('some-id')
    expect(ws.deserializeAttachment()).toEqual({ hi: 'some-id', wa: { v: 1 }, id: 'some-id' })

    expect(() => proxied['~orpc'].deserializeTokenPayload()).toThrow(
      new DurableIteratorError('Token payload not found, please call serializeTokenPayload first'),
    )
    proxied['~orpc'].serializeTokenPayload({ exp: 398398 })
    expect(proxied['~orpc'].deserializeTokenPayload()).toEqual({ exp: 398398 })
    expect(ws.deserializeAttachment()).toEqual({ tp: { exp: 398398 }, hi: 'some-id', wa: { v: 1 }, id: 'some-id' })
  })

  it('proxied and auto close if expired on send', async () => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    proxied['~orpc'].serializeTokenPayload({ id: 'some-id', exp: nowInSeconds + 1 })

    proxied.send('data')
    expect(ws.send).toHaveBeenCalledTimes(1)
    expect(ws.close).toHaveBeenCalledTimes(0)

    vi.mocked(ws.send as () => any).mockClear()

    await sleep(1001)
    proxied.send('data')
    expect(ws.send).toHaveBeenCalledTimes(1)
    expect(ws.close).toHaveBeenCalledTimes(1)
    expect(ws.close).toHaveBeenCalledBefore(ws.send)
  })

  it('not proxy again if already proxied', () => {
    expect(toDurableIteratorWebsocket(ws)).toBe(proxied)
    expect(toDurableIteratorWebsocket(proxied)).toBe(proxied)
  })
})
