---
title: RPCLink
description: Details on using RPCLink in oRPC clients.
---

# RPCLink

RPCLink enables communication with an [RPCHandler](/docs/rpc-handler) on your server using HTTP/Fetch.

## Overview

Before using RPCLink, ensure your server is running an [RPCHandler](/docs/rpc-handler).

```ts
import { RPCLink } from '@orpc/client/fetch'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  headers: () => ({
    'x-api-key': 'my-api-key'
  }),
  // fetch: <-- polyfill fetch if needed
})

export const client: RouterClient<typeof router> = createORPCClient(link)
```

## Using Client Context

Client context lets you pass extra information when calling procedures and dynamically modify RPCLink’s behavior.

```ts twoslash
import { router } from './shared/planet'
import { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

interface ClientContext {
  something?: string
}

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  headers: async ({ context }) => ({
    'x-api-key': context?.something ?? ''
  })
})

const client: RouterClient<typeof router, ClientContext> = createORPCClient(link)

const result = await client.planet.list(
  { limit: 10 },
  { context: { something: 'value' } }
)
```

:::info
If a property in `ClientContext` is required, oRPC enforces its inclusion when calling procedures.
:::

## Custom Request Method

By default, RPCLink sends requests via `POST`. You can override this to use methods like `GET` (for browser or CDN caching) based on your requirements.

```ts twoslash
import { RPCLink } from '@orpc/client/fetch'

interface ClientContext {
  cache?: RequestCache
}

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  method: ({ context, path }) => {
    if (context?.cache) {
      return 'GET'
    }

    const lastSegment = path.at(-1)
    if (lastSegment && /get|find|list|search/i.test(lastSegment)) {
      return 'GET'
    }

    return 'POST'
  },
  fetch: (request, init, { context }) => globalThis.fetch(request, {
    ...init,
    cache: context?.cache,
  }),
})
```

## SSE Like Behavior

Unlike traditional SSE, the [Event Iterator](/docs/event-iterator) does not automatically retry on error. To enable automatic retries, refer to the [Client Retry Plugin](/docs/plugins/client-retry).

## Event Iterator Keep Alive

:::warning
These options for sending [Event Iterator](/docs/event-iterator) from **client to the server**, not from **the server to client** as used in [RPCHandler Event Iterator Keep Alive](/docs/rpc-handler#event-iterator-keep-alive) or [OpenAPIHandler Event Iterator Keep Alive](/docs/openapi/openapi-handler#event-iterator-keep-alive).

**In 99% of cases, you don't need to configure these options.**
:::

To keep [Event Iterator](/docs/event-iterator) connections alive, `RPCLink` periodically sends a ping comment to the server. You can configure this behavior using the following options:

- `eventIteratorKeepAliveEnabled` (default: `true`) – Enables or disables pings.
- `eventIteratorKeepAliveInterval` (default: `5000`) – Time between pings (in milliseconds).
- `eventIteratorKeepAliveComment` (default: `''`) – Custom content for ping messages.

```ts
const link = new RPCLink({
  eventIteratorKeepAliveEnabled: true,
  eventIteratorKeepAliveInterval: 5000, // 5 seconds
  eventIteratorKeepAliveComment: '',
})
```
