import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { experimental_exposeORPCHandlerChannel as exposeORPCHandlerChannel } from '@orpc/server/electron-ipc'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  }
  catch (error) {
    console.error(error)
  }
}
else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}

exposeORPCHandlerChannel()
