<div align="center">
  <image align="center" src="https://orpc.unnoq.com/logo.webp" width=280 alt="oRPC logo" />
</div>

<h1></h1>

<div align="center">
  <a href="https://codecov.io/gh/unnoq/orpc">
    <img alt="codecov" src="https://codecov.io/gh/unnoq/orpc/branch/main/graph/badge.svg">
  </a>
  <a href="https://www.npmjs.com/package/@orpc/openapi">
    <img alt="weekly downloads" src="https://img.shields.io/npm/dw/%40orpc%2Fopenapi?logo=npm" />
  </a>
  <a href="https://github.com/unnoq/orpc/blob/main/LICENSE">
    <img alt="MIT License" src="https://img.shields.io/github/license/unnoq/orpc?logo=open-source-initiative" />
  </a>
  <a href="https://discord.gg/TXEbwRBvQn">
    <img alt="Discord" src="https://img.shields.io/discord/1308966753044398161?color=7389D8&label&logo=discord&logoColor=ffffff" />
  </a>
</div>

<h3 align="center">Typesafe APIs Made Simple 🪄</h3>

**oRPC is a powerful combination of RPC and OpenAPI**, makes it easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards

---

## Highlights

- **🔗 End-to-End Type Safety**: Ensure type-safe inputs, outputs, and errors from client to server.
- **📘 First-Class OpenAPI**: Built-in support that fully adheres to the OpenAPI standard.
- **📝 Contract-First Development**: Optionally define your API contract before implementation.
- **⚙️ Framework Integrations**: Seamlessly integrate with TanStack Query (React, Vue, Solid, Svelte, Angular), Pinia Colada, and more.
- **🚀 Server Actions**: Fully compatible with React Server Actions on Next.js, TanStack Start, and other platforms.
- **🔠 Standard Schema Support**: Works out of the box with Zod, Valibot, ArkType, and other schema validators.
- **🗃️ Native Types**: Supports native types like Date, File, Blob, BigInt, URL, and more.
- **⏱️ Lazy Router**: Enhance cold start times with our lazy routing feature.
- **📡 SSE & Streaming**: Enjoy full type-safe support for SSE and streaming.
- **🌍 Multi-Runtime Support**: Fast and lightweight on Cloudflare, Deno, Bun, Node.js, and beyond.
- **🔌 Extendability**: Easily extend functionality with plugins, middleware, and interceptors.
- **🛡️ Reliability**: Well-tested, TypeScript-based, production-ready, and MIT licensed.

## Documentation

You can find the full documentation [here](https://orpc.unnoq.com).

## Packages

- [@orpc/contract](https://www.npmjs.com/package/@orpc/contract): Build your API contract.
- [@orpc/server](https://www.npmjs.com/package/@orpc/server): Build your API or implement API contract.
- [@orpc/client](https://www.npmjs.com/package/@orpc/client): Consume your API on the client with type-safety.
- [@orpc/openapi](https://www.npmjs.com/package/@orpc/openapi): Generate OpenAPI specs and handle OpenAPI requests.
- [@orpc/nest](https://www.npmjs.com/package/@orpc/nest): Deeply integrate oRPC with [NestJS](https://nestjs.com/).
- [@orpc/react](https://www.npmjs.com/package/@orpc/react): Utilities for integrating oRPC with React and React Server Actions.
- [@orpc/tanstack-query](https://www.npmjs.com/package/@orpc/tanstack-query): [TanStack Query](https://tanstack.com/query/latest) integration.
- [@orpc/vue-colada](https://www.npmjs.com/package/@orpc/vue-colada): Integration with [Pinia Colada](https://pinia-colada.esm.dev/).
- [@orpc/hey-api](https://www.npmjs.com/package/@orpc/hey-api): [Hey API](https://heyapi.dev/) integration.
- [@orpc/zod](https://www.npmjs.com/package/@orpc/zod): More schemas that [Zod](https://zod.dev/) doesn't support yet.
- [@orpc/valibot](https://www.npmjs.com/package/@orpc/valibot): OpenAPI spec generation from [Valibot](https://valibot.dev/).
- [@orpc/arktype](https://www.npmjs.com/package/@orpc/arktype): OpenAPI spec generation from [ArkType](https://arktype.io/).

## `@orpc/openapi`

Generate OpenAPI specs and handle OpenAPI requests. Read the [documentation](https://orpc.unnoq.com/docs/openapi/getting-started) for more information.

```ts
import { createServer } from 'node:http'
import { OpenAPIHandler } from '@orpc/openapi/node'
import { CORSPlugin } from '@orpc/server/plugins'

const handler = new OpenAPIHandler(router, {
  plugins: [new CORSPlugin()]
})

const server = createServer(async (req, res) => {
  const result = await handler.handle(req, res, {
    context: { headers: req.headers }
  })

  if (!result.matched) {
    res.statusCode = 404
    res.end('No procedure matched')
  }
})

server.listen(3000, '127.0.0.1', () => console.log('Listening on 127.0.0.1:3000'))
```

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.svg'/>
  </a>
</p>

## License

Distributed under the MIT License. See [LICENSE](https://github.com/unnoq/orpc/blob/main/LICENSE) for more information.
