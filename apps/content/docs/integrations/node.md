---
title: Node Integration
description: Integrate oRPC with Node's built-in HTTP server
---

# Node Integration

[Node](https://nodejs.org/) is a popular runtime for server-side applications, offering native modules like `node:http`, `node:https`, and `node:http2`. oRPC supports these modules directly.

:::info
Rather than converting Node’s native server objects to the Fetch API under the hood like other libraries, oRPC integrates with Node’s built-in modules for optimal performance and minimal overhead.
:::

## `node:http` Server

```ts
import { createServer } from 'node:http'
import { RPCHandler } from '@orpc/server/node'
import { CORSPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin()
  ]
})

const server = createServer(async (req, res) => {
  const { matched } = await handler.handle(req, res, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return
  }

  res.statusCode = 404
  res.end('Not found')
})

server.listen(3000, '127.0.0.1', () => console.log('Listening on 127.0.0.1:3000'))
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::

## `node:http2` Server

```ts
import { createSecureServer } from 'node:http2'
import { RPCHandler } from '@orpc/server/node'
import { CORSPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin(),
  ],
})

const server = createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}, async (req, res) => {
  const { matched } = await handler.handle(req, res, {
    prefix: '/rpc',
    context: {}, // Provide initial context if needed
  })

  if (matched) {
    return
  }

  res.statusCode = 404
  res.end('Not found')
})

server.listen(3000, '127.0.0.1', () => console.log('Listening on 127.0.0.1:3000'))
```

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
