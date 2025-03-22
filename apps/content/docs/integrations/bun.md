---
title: Bun Integration
description: Integrate oRPC with Bun's built-in HTTP server
---

# Bun Integration

[Bun](https://bun.sh/) comes with a built-in, high-performance HTTP server that follows the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, refer to the [Fetch Server Integration](/docs/integrations/fetch-server) guide.

## Basic

```ts
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin()
  ]
})

Bun.serve({
  async fetch(request: Request) {
    const { matched, response } = await handler.handle(request, {
      prefix: '/rpc',
      context: {} // Provide initial context if needed
    })

    if (matched) {
      return response
    }

    return new Response('Not found', { status: 404 })
  }
})
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
