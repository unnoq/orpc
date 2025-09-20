import { createCloudflareWebsocket, createDurableObjectState } from '../../tests/shared'
import { toDurableIteratorObjectState } from './object-state'
import * as websocketModule from './websocket'

const toDurableIteratorWebsocketSpy = vi.spyOn(websocketModule, 'toDurableIteratorWebsocket')

describe('toDurableIteratorObjectState', () => {
  const ctx = createDurableObjectState()
  const proxied = toDurableIteratorObjectState(ctx) as any

  it('proxy with additional ~orpc', () => {
    expect('storage' in proxied).toBe(true)
    expect(proxied.storage).toBeInstanceOf(Object)

    expect('waitUntil' in proxied).toBe(true)
    expect(proxied.waitUntil).toBeInstanceOf(Function)

    expect('getWebSockets' in proxied).toBe(true)
    expect(proxied.getWebSockets).toBeInstanceOf(Function)

    expect('~orpc' in proxied).toBe(true)
    expect(proxied['~orpc']).toBeInstanceOf(Object)
    expect(proxied['~orpc'].original).toBe(ctx)
  })

  it('proxied getWebSockets result', () => {
    const ws1 = createCloudflareWebsocket()
    const ws2 = createCloudflareWebsocket()
    vi.mocked(ctx.getWebSockets as () => any).mockReturnValue([ws1, ws2])

    expect(proxied.getWebSockets(1, 2, 3)).toEqual([
      toDurableIteratorWebsocketSpy.mock.results[0]?.value,
      toDurableIteratorWebsocketSpy.mock.results[1]?.value,
    ])

    expect(ctx.getWebSockets).toHaveBeenCalledTimes(1)
    expect(ctx.getWebSockets).toHaveBeenCalledWith(1, 2, 3)

    expect(toDurableIteratorWebsocketSpy).toHaveBeenCalledTimes(2)
    expect(toDurableIteratorWebsocketSpy).toHaveBeenCalledWith(ws1)
    expect(toDurableIteratorWebsocketSpy).toHaveBeenCalledWith(ws2)
  })

  it('not proxy again if already proxied', () => {
    expect(toDurableIteratorObjectState(proxied)).toBe(proxied)
  })
})
