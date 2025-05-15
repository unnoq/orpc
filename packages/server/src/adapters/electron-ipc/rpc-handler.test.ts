import { decodeResponseMessage, encodeRequestMessage, MessageType } from '@orpc/standard-server-peer'
import { ipcMain } from 'electron'
import { os } from '../../builder'
import { experimental_RPCHandler as RPCHandler } from './rpc-handler'

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn(),
  },
}))

describe('rpcHandler', async () => {
  let signal: AbortSignal
  let onMessage: any

  const handler = new RPCHandler({
    ping: os.handler(async ({ signal: _signal }) => {
      signal = _signal!
      await new Promise(resolve => setTimeout(resolve, 10))
      return 'pong'
    }),

    file: os.handler(async ({ signal: _signal }) => {
      signal = _signal!
      await new Promise(resolve => setTimeout(resolve, 10))
      return new Blob(['pong'])
    }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    signal = undefined as any
    handler.upgrade()
    onMessage = vi.mocked(ipcMain.on).mock.calls[0]![1]
  })

  const ping_request_message = await encodeRequestMessage(19, MessageType.REQUEST, {
    url: new URL('orpc:/ping'),
    body: { json: 'input' },
    headers: {},
    method: 'POST',
  }) as any

  const file_request_message = new TextEncoder().encode(await encodeRequestMessage(19, MessageType.REQUEST, {
    url: new URL('orpc:/file'),
    body: { json: 'input' },
    headers: {},
    method: 'POST',
  }) as string) as any

  const not_found_request_message = await encodeRequestMessage(19, MessageType.REQUEST, {
    url: new URL('orpc:/not_found'),
    body: { json: 'input' },
    headers: {},
    method: 'POST',
  }) as any

  const abort_message = await encodeRequestMessage(19, MessageType.ABORT_SIGNAL, undefined) as any

  let sender: any
  beforeEach(() => {
    sender = {
      on: vi.fn(),
      send: vi.fn(),
    }
  })

  it('on success', async () => {
    onMessage({ sender }, ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 20))

    const [id, , payload] = (await decodeResponseMessage(sender.send.mock.calls[0]![1]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 200,
      headers: {},
      body: { json: 'pong' },
    })
  })

  it('on success with buffer data', async () => {
    onMessage({ sender }, file_request_message)

    await new Promise(resolve => setTimeout(resolve, 20))

    const [id, , payload] = (await decodeResponseMessage(sender.send.mock.calls[0]![1]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 200,
      headers: {
        'content-type': expect.any(String),
      },
      body: expect.any(FormData),
    })

    expect(await (payload as any).body.get('0').text()).toBe('pong')
  })

  it('on abort signal', async () => {
    onMessage({ sender }, ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signal.aborted).toBe(false)
    expect(sender.send).not.toHaveBeenCalled()

    onMessage({ sender }, abort_message)

    await new Promise(resolve => setTimeout(resolve, 20))

    expect(signal.aborted).toBe(true)
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('on close', async () => {
    onMessage({ sender }, ping_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(signal.aborted).toBe(false)
    expect(sender.send).not.toHaveBeenCalled()

    sender.on.mock.calls[0]![1]()
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(signal.aborted).toBe(true)
    expect(sender.send).not.toHaveBeenCalled()
  })

  it('on no procedure matched', async () => {
    onMessage({ sender }, not_found_request_message)

    await new Promise(resolve => setTimeout(resolve, 0))

    const [id,, payload] = (await decodeResponseMessage(sender.send.mock.calls[0]![1]))

    expect(id).toBeTypeOf('number')
    expect(payload).toEqual({
      status: 404,
      headers: {},
      body: 'No procedure matched',
    })
  })
})
