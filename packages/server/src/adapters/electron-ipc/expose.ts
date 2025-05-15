import type { experimental_ExposedORPCHandlerChannel } from '@orpc/client/electron-ipc'
import { DEFAULT_ORPC_HANDLER_CHANNEL } from '@orpc/client/electron-ipc'
import { contextBridge, ipcRenderer } from 'electron'

/**
 * Expose the ORPC handler channel to the renderer process.
 *
 * @param channel The channel name to expose - defaults to `orpc:default`
 *
 * @see {@link https://orpc.unnoq.com/docs/integrations/electron-ipc Electron IPC Integration Docs}
 */
export function experimental_exposeORPCHandlerChannel(
  channel = DEFAULT_ORPC_HANDLER_CHANNEL,
): void {
  contextBridge.exposeInMainWorld(channel, {
    send: message => ipcRenderer.send(channel, message),
    receive: callback => ipcRenderer.on(channel, (_, message) => callback(message)),
  } satisfies experimental_ExposedORPCHandlerChannel)
}
