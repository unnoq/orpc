import { decodeRequestMessage, encodeResponseMessage, MessageType } from '@orpc/standard-server-peer'
import { createORPCClient } from '../../client'
import { experimental_RPCLink as RPCLink } from './rpc-link'

beforeEach(() => {
  delete (globalThis as any)['orpc:default']
  vi.clearAllMocks()
})

describe('rpcLink', () => {
  it('it throw if not find exposed channel', () => {
    expect(() => new RPCLink()).toThrow()
  })

  describe('on success', () => {
    const send = vi.fn()
    const receive = vi.fn()
          ; (globalThis as any)['orpc:default'] = {
      send,
      receive,
    }
    const link = new RPCLink()
    const orpc = createORPCClient(link) as any

    const onMessage = receive.mock.calls[0]![0]

    it('with text', async () => {
      expect(orpc.ping('input')).resolves.toEqual('pong')

      await new Promise(resolve => setTimeout(resolve, 0))

      const [id, , payload] = (await decodeRequestMessage(send.mock.calls[0]![0]))

      expect(id).toBeTypeOf('number')
      expect(payload).toEqual({
        url: new URL('orpc:/ping'),
        body: { json: 'input' },
        headers: {},
        method: 'POST',
      })

      onMessage(await encodeResponseMessage(id, MessageType.RESPONSE, { body: { json: 'pong' }, status: 200, headers: {} }))
    })

    it('with blob', async () => {
      const form = new FormData()
      form.append('file', new Blob(['hello'], { type: 'text/plain' }))
      form.append('text', 'world')

      expect(orpc.ping({
        file: new Blob(['hello'], { type: 'text/plain' }),
        text: 'world',
      })).resolves.toEqual('pong')

      await new Promise(resolve => setTimeout(resolve, 0))

      const [id, , payload] = (await decodeRequestMessage(send.mock.calls[0]![0]))

      expect(id).toBeTypeOf('number')
      expect(payload).toEqual({
        url: new URL('orpc:/ping'),
        body: expect.toSatisfy(v => v instanceof FormData && v.get('0') instanceof Blob),
        headers: {
          'content-type': expect.stringContaining('multipart/form-data'),
        },
        method: 'POST',
      })

      onMessage(await encodeResponseMessage(id, MessageType.RESPONSE, { body: { json: 'pong' }, status: 200, headers: {} }))
    })
  })
})
