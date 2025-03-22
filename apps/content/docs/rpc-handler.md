---
title: RPC Handler
description: Comprehensive Guide to the RPCHandler in oRPC
---

# RPC Handler

The `RPCHandler` enables communication with clients over oRPC's proprietary [RPC protocol](/docs/advanced/rpc-protocol), built on top of HTTP. While it efficiently transfers native types, the protocol is neither human-readable nor OpenAPI-compatible. For OpenAPI support, use the [OpenAPIHandler](/docs/openapi/openapi-handler).

:::warning
`RPCHandler` is designed exclusively for [RPCLink](/docs/client/rpc-link) and **does not** support OpenAPI. Avoid sending requests to it manually.
:::

## Supported Data Types

`RPCHandler` natively serializes and deserializes the following JavaScript types:

- **string**
- **number** (including `NaN`)
- **boolean**
- **null**
- **undefined**
- **Date** (including `Invalid Date`)
- **BigInt**
- **RegExp**
- **URL**
- **Record (object)**
- **Array**
- **Set**
- **Map**
- **Blob** (unsupported in `AsyncIteratorObject`)
- **File** (unsupported in `AsyncIteratorObject`)
- **AsyncIteratorObject** (only at the root level; powers the [Event Iterator](/docs/event-iterator))

:::tip
You can extend the list of supported types by [creating a custom serializer](/docs/advanced/rpc-json-serializer#extending-native-data-types).
:::

## Setup and Integration

```ts
import { RPCHandler } from '@orpc/server/fetch' // or '@orpc/server/node'
import { CORSPlugin } from '@orpc/server/plugins'
import { onError } from '@orpc/server'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin()
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    })
  ],
})

export default async function fetch(request: Request) {
  const { matched, response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if required
  })

  if (matched) {
    return response
  }

  return new Response('Not Found', { status: 404 })
}
```

## Event-Iterator Keep Alive

To keep [Event Iterator](/docs/event-iterator) connections alive, `RPCHandler` periodically sends a ping comment to the client. You can configure this behavior using the following options:

- `eventIteratorKeepAliveEnabled` (default: `true`) – Enables or disables pings.
- `eventIteratorKeepAliveInterval` (default: `5000`) – Time between pings (in milliseconds).
- `eventIteratorKeepAliveComment` (default: `''`) – Custom content for ping comments.

```ts
const result = await handler.handle(request, {
  eventIteratorKeepAliveEnabled: true,
  eventIteratorKeepAliveInterval: 5000, // 5 seconds
  eventIteratorKeepAliveComment: '',
})
```
