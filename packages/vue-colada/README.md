<div align="center">
  <image align="center" src="https://orpc.unnoq.com/logo.webp" width=280 alt="oRPC logo" />
</div>

<h1></h1>

<div align="center">
  <a href="https://codecov.io/gh/unnoq/orpc">
    <img alt="codecov" src="https://codecov.io/gh/unnoq/orpc/branch/main/graph/badge.svg">
  </a>
  <a href="https://www.npmjs.com/package/@orpc/vue-colada">
    <img alt="weekly downloads" src="https://img.shields.io/npm/dw/%40orpc%2Fvue-colada?logo=npm" />
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
- **Framework Integrations 🧩**: Supports Tanstack Query (React, Vue, Solid, Svelte), Pinia Colada, and more.
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
- [@orpc/react](https://www.npmjs.com/package/@orpc/react): Utilities for integrating oRPC with React and React Server Actions.
- [@orpc/react-query](https://www.npmjs.com/package/@orpc/react-query): Integration with [React Query](https://tanstack.com/query/latest/docs/framework/react/overview).
- [@orpc/vue-query](https://www.npmjs.com/package/@orpc/vue-query): Integration with [Vue Query](https://tanstack.com/query/latest/docs/framework/vue/overview).
- [@orpc/solid-query](https://www.npmjs.com/package/@orpc/solid-query): Integration with [Solid Query](https://tanstack.com/query/latest/docs/framework/solid/overview).
- [@orpc/svelte-query](https://www.npmjs.com/package/@orpc/svelte-query): Integration with [Svelte Query](https://tanstack.com/query/latest/docs/framework/svelte/overview).
- [@orpc/vue-colada](https://www.npmjs.com/package/@orpc/vue-colada): Integration with [Pinia Colada](https://pinia-colada.esm.dev/).
- [@orpc/openapi](https://www.npmjs.com/package/@orpc/openapi): Generate OpenAPI specs and handle OpenAPI requests.
- [@orpc/zod](https://www.npmjs.com/package/@orpc/zod): More schemas that [Zod](https://zod.dev/) doesn't support yet.
- [@orpc/valibot](https://www.npmjs.com/package/@orpc/valibot): OpenAPI spec generation from [Valibot](https://valibot.dev/).
- [@orpc/arktype](https://www.npmjs.com/package/@orpc/arktype): OpenAPI spec generation from [ArkType](https://arktype.io/).

## `@orpc/vue-colada`

Integration with [Pinia Colada](https://pinia-colada.esm.dev/). Read the [documentation](https://orpc.unnoq.com/docs/pinia-colada) for more information.

```ts
export function Setup() {
  const query = useQuery(orpc.planet.find.queryOptions({
    input: { id: 123 }, // Specify input if needed
    context: { cache: true }, // Provide client context if needed
  // additional options...
  }))

  const mutation = useMutation(orpc.planet.create.mutationOptions({
    context: { cache: true }, // Provide client context if needed
  // additional options...
  }))

  mutation.mutate({ name: 'Earth' })

  const queryCache = useQueryCache()

  // Invalidate all planet queries
  queryCache.invalidateQueries({
    key: orpc.planet.key(),
  })

  // Invalidate the planet find query with id 123
  queryCache.invalidateQueries({
    key: orpc.planet.find.key({ input: { id: 123 } })
  })
}
```

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.svg'/>
  </a>
</p>

## License

Distributed under the MIT License. See [LICENSE](https://github.com/unnoq/orpc/blob/main/LICENSE) for more information.
