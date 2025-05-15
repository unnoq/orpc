---
title: Electron IPC Integration
description: Integrate oRPC with Electron IPC
---

# Electron IPC Integration

[Electron IPC](https://www.electronjs.org/docs/latest/tutorial/ipc) is a built-in IPC mechanism in Electron that allows you to communicate between the main process and renderer processes. For additional context, refer to the [IPC Adapter](/docs/adapters/ipc) guide.

## Basic

1. **main script**: Create and upgrade an oRPC handler.

   ```ts
   import { app } from 'electron'
   import { experimental_RPCHandler as RPCHandler } from '@orpc/server/electron-ipc'

   const handler = new RPCHandler(router)

   app.whenReady().then(() => {
     handler.upgrade({
       context: {}, // Provide initial context if needed
     })
   })
   ```

2. **preload script**: Expose the oRPC handler channel to the renderer process.

   ```ts
   import { experimental_exposeORPCHandlerChannel as exposeORPCHandlerChannel } from '@orpc/server/electron-ipc'

   exposeORPCHandlerChannel()
   ```

3. **renderer script**: Create an oRPC link and use it to initialize the client.

   ```ts
   import { experimental_RPCLink as RPCLink } from '@orpc/client/electron-ipc'

   const link = new RPCLink()
   ```

   :::info
   This only shows how to configure the link. For full client examples, see [Client-Side Clients](/docs/client/client-side).
   :::
