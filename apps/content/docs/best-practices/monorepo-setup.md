---
title: Monorepo Setup
description: The most efficient way to set up a monorepo with oRPC
---

# Monorepo Setup

A monorepo stores multiple related projects in a single repository, a common practice for managing interconnected projects like web applications and their APIs.

This guide shows you how to efficiently set up a monorepo with oRPC while maintaining end-to-end type safety across all projects.

## TypeScript Project References

When consuming, some parts of the client may end up being typed as `any` because the client environment doesn't have access to all types that oRPC procedures depend on. The most effective solution is to use [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html). This ensures the client can resolve all types used by oRPC procedures while also improving TypeScript performance.

::: code-group

```json [client/tsconfig.json]
{
  "compilerOptions": {
    // ...
  },
  "references": [
    { "path": "../server" } // [!code highlight]
  ]
}
```

```json [server/tsconfig.json]
{
  "compilerOptions": {
    "composite": true // [!code highlight]
    // ...
  }
}
```

:::

## Recommended Structure

- `/apps`: `references` dependencies in `tsconfig.json`
- `/packages`: Enable `composite` in `tsconfig.json`

The key principle is separating the server component (with `composite` enabled) into a dedicated package containing only necessary files. This approach simplifies dealing with the `composite` option's constraints.

::: details Common `composite` option's constraint
The most common issue with `composite` is missing type definitions, resulting in: `The inferred type of "X" cannot be named without a reference to "Y". This is likely not portable. A type annotation is necessary.`

If you encounter this, try installing package `Y` if not already installed and adding this to your codebase where the error occurs:

```ts
import type * as _A from '../../node_modules/detail_Y_path_here'
```

:::

::: tip
Avoid **alias imports** inside server components when possible. Instead, use **linked workspace packages** (e.g., [PNPM Workspace protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)).
:::

::: code-group

```txt [contract-first]
apps/
├─ api/    // Import `core-contract` and implement it
├─ web/    // Import `core-contract` and set up @orpc/client here
├─ app/
packages/
├─ core-contract/  // Define contract with @orpc/contract
├─ .../
```

```txt [normal]
apps/
├─ api/    // Import `core-service` and run it in your environment
├─ web/    // Import `core-service` and set up @orpc/client here
├─ app/
packages/
├─ core-service/   // Define procedures with @orpc/server
├─ .../
```

:::

::: info
This is just a suggestion. You can structure your monorepo however you like.
:::

## Related

- [Publish Client to NPM](/docs/advanced/publish-client-to-npm)
