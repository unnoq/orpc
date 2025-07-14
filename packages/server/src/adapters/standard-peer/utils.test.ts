import { encodeRequestMessage, encodeResponseMessage, MessageType, ServerPeer } from '@orpc/standard-server-peer'
import {
  handleStandardServerPeerMessage,
} from './utils'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleStandardServerPeerMessage', () => {
  const send = vi.fn()
  const peer = new ServerPeer(send)
  const handler = {
    handle: vi.fn(async () => ({ response: undefined })),
  } as any

  it('do nothing if not a request', async () => {
    const message = await encodeRequestMessage('test', MessageType.ABORT_SIGNAL, void 0)

    await handleStandardServerPeerMessage(
      handler,
      peer,
      message,
      { context: { context: true } },
    )

    expect(send).toHaveBeenCalledTimes(0)
    expect(handler.handle).toHaveBeenCalledTimes(0)
  })

  it('send request if handler matches', async () => {
    const request = {
      body: 'test',
      headers: { 'x-custom': 'value' },
      method: 'GET',
      url: new URL('http://localhost/test'),
    }
    const response = { status: 200, headers: {}, body: 'ok' }

    handler.handle.mockResolvedValueOnce({ response })

    const message = await encodeRequestMessage('test', MessageType.REQUEST, request)

    await handleStandardServerPeerMessage(
      handler,
      peer,
      message,
      { context: { context: true } },
    )

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      await encodeResponseMessage('test', MessageType.RESPONSE, response),
    )

    expect(handler.handle).toHaveBeenCalledTimes(1)
    expect(handler.handle).toHaveBeenCalledWith(
      { ...request, body: expect.any(Function), signal: expect.any(AbortSignal) },
      { context: { context: true } },
    )
  })

  it('send 404 request if handler not matches', async () => {
    const request = {
      body: 'test',
      headers: { 'x-custom': 'value' },
      method: 'GET',
      url: new URL('http://localhost/test'),
    }

    const message = await encodeRequestMessage('test', MessageType.REQUEST, request)

    await handleStandardServerPeerMessage(
      handler,
      peer,
      message,
      { context: { context: true } },
    )

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(
      await encodeResponseMessage('test', MessageType.RESPONSE, { status: 404, headers: {}, body: 'No procedure matched' }),
    )

    expect(handler.handle).toHaveBeenCalledTimes(1)
    expect(handler.handle).toHaveBeenCalledWith(
      { ...request, body: expect.any(Function), signal: expect.any(AbortSignal) },
      { context: { context: true } },
    )
  })
})
