<div align="center">
  <image align="center" src="https://orpc.unnoq.com/logo.webp" width=280 />
</div>

<h1></h1>

<div align="center">
  <a href="https://codecov.io/gh/unnoq/orpc">
    <img alt="codecov" src="https://codecov.io/gh/unnoq/orpc/branch/main/graph/badge.svg">
  </a>
  <a href="https://www.npmjs.com/package/@orpc/client">
    <img alt="weekly downloads" src="https://img.shields.io/npm/dw/%40orpc%2Fclient?logo=npm" />
  </a>
  <a href="https://github.com/unnoq/orpc/blob/main/LICENSE">
    <img alt="MIT License" src="https://img.shields.io/github/license/unnoq/orpc?logo=open-source-initiative" />
  </a>
  <a href="https://discord.gg/TXEbwRBvQn">
    <img alt="Discord" src="https://img.shields.io/discord/1308966753044398161?color=7389D8&label&logo=discord&logoColor=ffffff" />
  </a>
</div>

<h3 align="center">Typesafe APIs Made Simple 🪄</h3>

**oRPC is a powerful combination of RPC and OpenAPI**, makes it easy to build APIs that are end-to-end type-safe and adhere to OpenAPI standards, ensuring a smooth and enjoyable developer experience.

---

## Highlights

- **End-to-End Type Safety 🔒**: Ensure complete type safety from inputs to outputs and errors, bridging server and client seamlessly.
- **First-Class OpenAPI 📄**: Adheres to the OpenAPI standard out of the box, ensuring seamless integration and comprehensive API documentation.
- **Contract-First Development 📜**: (Optional) Define your API contract upfront and implement it with confidence.
- **Exceptional Developer Experience ✨**: Enjoy a streamlined workflow with robust typing and clear, in-code documentation.
- **Multi-Runtime Support 🌍**: Run your code seamlessly on Cloudflare, Deno, Bun, Node.js, and more.
- **Framework Integrations 🧩**: Supports Tanstack Query (React, Vue), Pinia Colada, and more.
- **Server Actions ⚡️**: Fully compatible with React Server Actions on Next.js, TanStack Start, and more.
- **Standard Schema Support 🗂️**: Effortlessly work with Zod, Valibot, ArkType, and others right out of the box.
- **Fast & Lightweight 💨**: Built on native APIs across all runtimes – optimized for speed and efficiency.
- **Native Types 📦**: Enjoy built-in support for Date, File, Blob, BigInt, URL and more with no extra setup.
- **Lazy Router ⏱️**: Improve cold start times with our lazy routing feature.
- **SSE & Streaming 📡**: Provides SSE and streaming features – perfect for real-time notifications and AI-powered streaming responses.
- **Reusability 🔄**: Write once and reuse your code across multiple purposes effortlessly.
- **Extendability 🔌**: Easily enhance oRPC with plugins, middleware, and interceptors.
- **Reliability 🛡️**: Well-tested, fully TypeScript, production-ready, and MIT licensed for peace of mind.
- **Simplicity 💡**: Enjoy straightforward, clean code with no hidden magic.

## Documentation

You can find the full documentation [here](https://orpc.unnoq.com).

## Packages

- [@orpc/contract](https://www.npmjs.com/package/@orpc/contract): Build your API contract.
- [@orpc/server](https://www.npmjs.com/package/@orpc/server): Build your API or implement API contract.
- [@orpc/client](https://www.npmjs.com/package/@orpc/client): Consume your API on the client with type-safety.
- [@orpc/react-query](https://www.npmjs.com/package/@orpc/react-query): Integration with [React Query](https://tanstack.com/query/latest/docs/framework/react/overview).
- [@orpc/vue-query](https://www.npmjs.com/package/@orpc/vue-query): Integration with [Vue Query](https://tanstack.com/query/latest/docs/framework/vue/overview).
- [@orpc/vue-colada](https://www.npmjs.com/package/@orpc/vue-colada): Integration with [Pinia Colada](https://pinia-colada.esm.dev/).
- [@orpc/openapi](https://www.npmjs.com/package/@orpc/openapi): Generate OpenAPI specs and handle OpenAPI requests.
- [@orpc/zod](https://www.npmjs.com/package/@orpc/zod): More schemas that [Zod](https://zod.dev/) doesn't support yet.

## Overview

This is a quick overview of how to use oRPC. For more details, please refer to the [documentation](https://orpc.unnoq.com).

1. **Define your router:**

   ```ts
   import type { IncomingHttpHeaders } from 'node:http'
   import { ORPCError, os } from '@orpc/server'
   import { z } from 'zod'

   const PlanetSchema = z.object({
     id: z.number().int().min(1),
     name: z.string(),
     description: z.string().optional(),
   })

   export const listPlanet = os
     .input(
       z.object({
         limit: z.number().int().min(1).max(100).optional(),
         cursor: z.number().int().min(0).default(0),
       }),
     )
     .handler(async ({ input }) => {
       // your list code here
       return [{ id: 1, name: 'name' }]
     })

   export const findPlanet = os
     .input(PlanetSchema.pick({ id: true }))
     .handler(async ({ input }) => {
       // your find code here
       return { id: 1, name: 'name' }
     })

   export const createPlanet = os
     .$context<{ headers: IncomingHttpHeaders }>()
     .use(({ context, next }) => {
       const user = parseJWT(context.headers.authorization?.split(' ')[1])

       if (user) {
         return next({ context: { user } })
       }

       throw new ORPCError('UNAUTHORIZED')
     })
     .input(PlanetSchema.omit({ id: true }))
     .handler(async ({ input, context }) => {
       // your create code here
       return { id: 1, name: 'name' }
     })

   export const router = {
     planet: {
       list: listPlanet,
       find: findPlanet,
       create: createPlanet
     }
   }
   ```

2. **Create your server:**

   ```ts
   import { createServer } from 'node:http'
   import { RPCHandler } from '@orpc/server/node'
   import { CORSPlugin } from '@orpc/server/plugins'

   const handler = new RPCHandler(router, {
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

   server.listen(
     3000,
     '127.0.0.1',
     () => console.log('Listening on 127.0.0.1:3000')
   )
   ```

3. **Create your client:**

   ```ts
   import type { RouterClient } from '@orpc/server'
   import { createORPCClient } from '@orpc/client'
   import { RPCLink } from '@orpc/client/fetch'

   const link = new RPCLink({
     url: 'http://127.0.0.1:3000',
     headers: { Authorization: 'Bearer token' },
   })

   export const orpc: RouterClient<typeof router> = createORPCClient(link)
   ```

4. **Consume your API:**

   ```ts
   import { orpc } from './client'

   const planets = await orpc.planet.list({ limit: 10 })
   ```

5. **Generate OpenAPI Spec:**

   ```ts
   import { OpenAPIGenerator } from '@orpc/openapi'
   import { ZodToJsonSchemaConverter } from '@orpc/zod'

   const generator = new OpenAPIGenerator({
     schemaConverters: [new ZodToJsonSchemaConverter()]
   })

   const spec = await generator.generate(router, {
     info: {
       title: 'Planet API',
       version: '1.0.0'
     }
   })

   console.log(spec)
   ```

## References

oRPC is inspired by existing solutions that prioritize type safety and developer experience. Special acknowledgments to:

- [tRPC](https://trpc.io): For pioneering the concept of end-to-end type-safe RPC and influencing the development of type-safe APIs.
- [ts-rest](https://ts-rest.com): For its emphasis on contract-first development and OpenAPI integration, which have greatly inspired oRPC’s feature set.

## License

Distributed under the MIT License. See [LICENSE](https://github.com/unnoq/orpc/blob/main/LICENSE) for more information.
