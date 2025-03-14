---
title: Playgrounds
description: Interactive development environments for exploring and testing oRPC functionality.
---

# Playgrounds

Explore oRPC implementations through our interactive playgrounds,
featuring pre-configured examples accessible instantly via StackBlitz or local setup.

## Available Playgrounds

| Environment               | StackBlitz                                                                                          | GitHub Source                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Next.js Playground        | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/nextjs)         | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/nextjs)         |
| Nuxt.js Playground        | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/nuxt)           | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/nuxt)           |
| Solid Start Playground    | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/solid-start)    | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/solid-start)    |
| Svelte Kit Playground     | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/svelte-kit)     | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/svelte-kit)     |
| Contract-First Playground | [Open in StackBlitz](https://stackblitz.com/github/unnoq/orpc/tree/main/playgrounds/contract-first) | [View Source](https://github.com/unnoq/orpc/tree/main/playgrounds/contract-first) |

:::warning
StackBlitz has own limitations, so some features may not work as expected.
:::

## Local Development

If you prefer working locally, you can clone any playground using the following commands:

```bash
npx degit unnoq/orpc/playgrounds/nextjs orpc-nextjs-playground
npx degit unnoq/orpc/playgrounds/nuxt orpc-nuxt-playground
npx degit unnoq/orpc/playgrounds/solid-start orpc-solid-start-playground
npx degit unnoq/orpc/playgrounds/svelte-kit orpc-svelte-kit-playground
npx degit unnoq/orpc/playgrounds/contract-first orpc-contract-first-playground
```

For each project, set up the development environment:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

That's it! You can now access the playground at `http://localhost:3000`.
