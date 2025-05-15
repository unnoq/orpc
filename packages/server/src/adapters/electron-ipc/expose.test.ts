import { contextBridge, ipcRenderer } from 'electron'
import { experimental_exposeORPCHandlerChannel as exposeORPCHandlerChannel } from './expose'

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    on: vi.fn(),
    send: vi.fn(),
  },
}))

beforeEach(() => {
  delete (globalThis as any)['orpc:default']
})

it('exposeORPCHandlerChannel', () => {
  exposeORPCHandlerChannel()

  expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith('orpc:default', {
    send: expect.any(Function),
    receive: expect.any(Function),
  })

  vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0]![1].send('hello')
  expect(ipcRenderer.send).toHaveBeenCalledWith('orpc:default', 'hello')

  const messages: string[] = []
  vi.mocked(contextBridge.exposeInMainWorld).mock.calls[0]![1].receive((message: any) => messages.push(message))
  vi.mocked(ipcRenderer.on).mock.calls[0]![1]({} as any, 'hello')
  expect(messages).toEqual(['hello'])
})
