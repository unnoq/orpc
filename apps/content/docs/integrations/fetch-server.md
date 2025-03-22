---
title: Fetch Server Integration
description: Integrate oRPC with the modern Fetch API Server
---

# Fetch Server Integration

The Fetch API Server is a lightweight and high-performance server available in modern runtimes such as [Deno](https://deno.land/), [Bun](https://bun.sh/), and [Cloudflare Workers](https://workers.cloudflare.com/).

## Basic

```ts
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin()
  ]
})

export async function fetch(request: Request): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return response
  }

  return new Response('Not found', { status: 404 })
}
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
