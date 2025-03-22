---
title: Deno Integration
description: Integrate oRPC with Deno's built-in HTTP server
---

# Deno Integration

[Deno](https://deno.land/) provide a serverless execution environment for building fast, globally distributed applications that follow the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). For additional context, refer to the [Fetch Server Integration](/docs/integrations/fetch-server) guide.

## Basic

```ts
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin()
  ]
})

Deno.serve(async (request) => {
  const { matched, response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return response
  }

  return new Response('Not found', { status: 404 })
})
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
