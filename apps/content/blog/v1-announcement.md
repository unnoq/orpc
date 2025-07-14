---
title: oRPC v1 Announcement - Typesafe APIs Made Simple 🪄
description: oRPC v1 is now available - tRPC, ts-rest, next-safe-action, and more alternatives!
titleTemplate: ':title'
---

# oRPC v1 Announcement - Typesafe APIs Made Simple 🪄

oRPC is a thing help you build type-safe APIs with TypeScript. It has its own goal but can fairly be compared to other libraries like tRPC, ts-rest, next-safe-action, etc. or even serve as an alternative to them.

## My Story

My oRPC journey started in early 2024 after I lost my job. Finding a new one was hard, and I realized a standard job wasn't really what I wanted. I had always dreamed of being an "indie hacker" – someone who makes useful things for others.

But looking back at my past work, I noticed something: I often spent more time complaining about the tools I used than focusing on what users needed. Maybe I cared too much about the tools themselves.

Because I was often frustrated with existing tools, I changed my plan. I thought, "What if I make a tool for developers, one that fixes the problems I always had?" I hoped that if I built a tool I liked, other developers would like it too.

That's how oRPC started. I began working hard on it around September 17, 2024. It wasn't easy; I had to rebuild oRPC three times to get the base right. After about three months, I shared an early version on Reddit ([see post](https://www.reddit.com/r/nextjs/comments/1h13upv/new_introducing_orpc_a_dropin_replacement_for/)).

At first, oRPC was just a side project. Then, a turning point came when someone privately offered **$100** to support it. I was surprised and really motivated! A month after that, I decided to stop my other projects and work on oRPC full-time, even though I didn't have another job. My life became: code, eat, sleep, repeat.

I had so many ideas for oRPC. I realized it would take all my focus and time, probably until the end of 2025, to make it happen.

But !!! Today is a **big step** on that journey. I'm happy and proud to announce that the core of oRPC is now stable, and Version 1.0 is officially out!

::: info
V1 means the public API is stable and ready for production use.
:::

## The Idea behind oRPC

oRPC philosophy is **powerful simplicity**. Define your API endpoints almost as easily as writing standard functions, yet automatically gain:

- End-to-end type safety (includes **errors**)
- Server Action compatibility
- Full OpenAPI specification generation
- Contract-first workflow support
- Standard function call compatibility

```ts
const getting = os
  .use(dbProvider)
  .use(requiredAuth)
  .use(rateLimit)
  .use(analytics)
  .use(sentryMonitoring)
  .use(retry({ times: 3 }))
  .route({ method: 'GET', path: '/getting/{id}' })
  .input(z.object({ id: z.string() }))
  .use(canGetting, input => input.id)
  .errors({
    SOME_TYPE_SAFE_ERROR: {
      data: z.object({ something: z.string() })
    }
  })
  .handler(async ({ input, errors, context }) => {
    // do something
  })
  .actionable() // server action compatible
  .callable() // regular function compatible
```

Beyond built-in features, oRPC [metadata](https://orpc.unnoq.com/docs/metadata) system allows for community-driven extensions and future possibilities.

## Highlights

- **🔗 End-to-End Type Safety**: Ensure type-safe inputs, outputs, and errors from client to server.
- **📘 First-Class OpenAPI**: Built-in support that fully adheres to the OpenAPI standard.
- **📝 Contract-First Development**: Optionally define your API contract before implementation.
- **⚙️ Framework Integrations**: Seamlessly integrate with TanStack Query (React, Vue, Solid, Svelte), Pinia Colada, and more.
- **🚀 Server Actions**: Fully compatible with React Server Actions on Next.js, TanStack Start, and other platforms.
- **🔠 Standard Schema Support**: Works out of the box with Zod, Valibot, ArkType, and other schema validators.
- **🗃️ Native Types**: Supports native types like Date, File, Blob, BigInt, URL, and more.
- **⏱️ Lazy Router**: Enhance cold start times with our lazy routing feature.
- **📡 SSE & Streaming**: Enjoy full type-safe support for SSE and streaming.
- **🌍 Multi-Runtime Support**: Fast and lightweight on Cloudflare, Deno, Bun, Node.js, and beyond.
- **🔌 Extendability**: Easily extend functionality with plugins, middleware, and interceptors.
- **🛡️ Reliability**: Well-tested, TypeScript-based, production-ready, and MIT licensed.

## tRPC alternative

I used tRPC extensively and really liked it. However, I needed OpenAPI support for my projects. Although I found `trpc-openapi` to add OpenAPI to tRPC, it didn't work with Edge runtimes and has since been deprecated. This was very frustrating, prompting me to look for alternatives.

Also, setting up tRPC sometimes felt too complicated, especially for smaller projects like Cloudflare Durable Objects where I just needed a simple API. Another point is that tRPC mostly supports React Query. That was okay for me, but less helpful if you want to use Vue, Solid, or Svelte.

I did some **simple** benchmarks between oRPC and tRPC, and results show (full report [here](https://github.com/unnoq/orpc-benchmarks)):

- oRPC is **1,6 times typecheck faster** (5.9s vs 9.3s)
- oRPC is **2,8 times runtime faster** (295k reqs vs 104k reqs / 20 sec)
- oRPC is **1,26 times less max cpu usage** (102% vs 129%)
- oRPC is **2,6 times less max ram usage** (103MB vs 268MB)
- oRPC is **2 times smaller in bundle size** ([32.3 kB](https://bundlejs.com/?q=%40orpc%2Fclient%2C%40orpc%2Fclient%2Ffetch%2C%40orpc%2Fserver%2C%40orpc%2Fserver%2Fnode&treeshake=%5B%7B+createORPCClient+%7D%5D%2C%5B%7B+RPCLink+%7D%5D%2C%5B%7B+os+%7D%5D%2C%5B%7B+RPCHandler+%7D%5D) vs [65.5 kB](https://bundlejs.com/?q=%40trpc%2Fclient%2C%40trpc%2Fserver%2C%40trpc%2Fserver%2Fadapters%2Fstandalone%2Csuperjson&treeshake=%5B%7B+createTRPCClient%2ChttpLink%2ChttpSubscriptionLink%2CsplitLink+%7D%5D%2C%5B%7B+initTRPC+%7D%5D%2C%5B%7B+createHTTPServer+%7D%5D%2C%5B%7B+default+as+SuperJSON+%7D%5D))

:::warning
Benchmark results can vary across environments and depend heavily on factors like your project's size, complexity, and setup. Many conditions can influence the outcome — so treat these numbers as a helpful reference, not a guarantee.
:::

::: info
You can read more about comparison [here](/docs/comparison)
:::

## ts-rest alternative

After running into the OpenAPI issues with tRPC, I tried ts-rest. While it helped with OpenAPI, I soon found it was missing features I relied on from tRPC, like flexible middleware and easy handling of certain data types (like Dates or Files). After using it for some APIs, I felt it wasn't the complete solution I wanted. This frustration was a key reason I started building oRPC.

::: info
You can read more about comparison [here](/docs/comparison)
:::

## next-safe-action alternative

I also experimented with `next-safe-action` to test server actions in Next.js, hoping they might be a good replacement for the tRPC style. However, I found they didn't quite fit my needs. I believe a dedicated RPC library like oRPC still provides a better developer experience for building APIs.

## Sponsors

In this long journey, I specially thank all my sponsors, they help me to keep going.

- [Zuplo - Serverless API Gateway, designed for developers](https://zuplo.link/orpc)
- [村上さん](https://github.com/SanMurakami)
- [あわわわとーにゅ](https://github.com/u1-liquid)
- [motopods](https://github.com/motopods)
- [Maxie](https://github.com/MrMaxie)
- [Stijn Timmer](https://github.com/Stijn-Timmer)
- [Robbe95](https://github.com/Robbe95)
- And my first sponsor (private) to start my story

If you're interesting in sponsoring oRPC, you can do it [here](https://github.com/sponsors/unnoq).

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/unnoq/unnoq/sponsors.svg'/>
  </a>
</p>
