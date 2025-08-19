---
title: React SWR Integration
description: Integrate oRPC with React SWR for efficient data fetching and caching.
---

# React SWR Integration

[SWR](https://swr.vercel.app/) is a React Hooks library for data fetching that provides features like caching, revalidation, and more. oRPC SWR integration is very lightweight and straightforward - there's no extra overhead.

::: warning
This documentation assumes you are already familiar with [SWR](https://swr.vercel.app/). If you need a refresher, please review the official SWR documentation before proceeding.
:::

## Installation

::: code-group

```sh [npm]
npm install @orpc/experimental-react-swr@latest
```

```sh [yarn]
yarn add @orpc/experimental-react-swr@latest
```

```sh [pnpm]
pnpm add @orpc/experimental-react-swr@latest
```

```sh [bun]
bun add @orpc/experimental-react-swr@latest
```

```sh [deno]
deno install npm:@orpc/experimental-react-swr@latest
```

:::

::: warning
The `experimental-` prefix indicates that this integration is still in development and may change in the future.
:::

## Setup

Before you begin, ensure you have already configured a [server-side client](/docs/client/server-side) or a [client-side client](/docs/client/client-side).

```ts twoslash
import { router } from './shared/planet'
import { RouterClient } from '@orpc/server'

declare const client: RouterClient<typeof router>
// ---cut---
import { createSWRUtils } from '@orpc/experimental-react-swr'

export const orpc = createSWRUtils(client)

orpc.planet.find.key({ input: { id: 123 } })
//               ^|

//

//

//

//
```

::: details Avoiding Key Conflicts?

You can easily avoid key conflicts by passing a unique base key when creating your utils:

```ts
const userORPC = createSWRUtils(userClient, {
  path: ['user']
})

const postORPC = createSWRUtils(postClient, {
  path: ['post']
})
```

:::

## Data Fetching

Use `.key` and `.fetcher` methods to configure `useSWR` for data fetching:

```ts
import useSWR from 'swr'

const { data, error, isLoading } = useSWR(
  orpc.planet.find.key({ input: { id: 123 } }),
  orpc.planet.find.fetcher({ context: { cache: true } }), // Provide client context if needed
)
```

## Infinite Queries

Use `.key` and `.fetcher` methods to configure `useSWRInfinite` for infinite queries:

```ts
import useSWRInfinite from 'swr/infinite'

const { data, error, isLoading, size, setSize } = useSWRInfinite(
  (index, previousPageData) => {
    if (previousPageData && !previousPageData.nextCursor) {
      return null // reached the end
    }

    return orpc.planet.list.key({ input: { cursor: previousPageData?.nextCursor } })
  },
  orpc.planet.list.fetcher({ context: { cache: true } }), // Provide client context if needed
)
```

## Subscriptions

Use `.key` and `.subscriber` methods to configure `useSWRSubscription` to subscribe to an [Event Iterator](/docs/event-iterator):

```ts
import useSWRSubscription from 'swr/subscription'

const { data, error } = useSWRSubscription(
  orpc.streamed.key({ input: { id: 3 } }),
  orpc.streamed.subscriber({ context: { cache: true }, maxChunks: 10 }), // Provide client context if needed
)
```

Use `.liveSubscriber` to subscribe to the latest events without chunking:

```ts
import useSWRSubscription from 'swr/subscription'

const { data, error } = useSWRSubscription(
  orpc.streamed.key({ input: { id: 3 } }),
  orpc.streamed.liveSubscriber({ context: { cache: true } }), // Provide client context if needed
)
```

## Mutations

Use `.key` and `.mutator` methods to configure `useSWRMutation` for mutations with automatic revalidation on success:

```ts
import useSWRMutation from 'swr/mutation'

const { trigger, isMutating } = useSWRMutation(
  orpc.planet.list.key(),
  orpc.planet.create.mutator({ context: { cache: true } }), // Provide client context if needed
)

trigger({ name: 'New Planet' }) // auto revalidate orpc.planet.list.key() on success
```

## Manual Revalidation

Use `.matcher` to invalidate data manually:

```ts
import { mutate } from 'swr'

mutate(orpc.matcher()) // invalidate all orpc data
mutate(orpc.planet.matcher()) // invalidate all planet data
mutate(orpc.planet.find.matcher({ input: { id: 123 }, strategy: 'exact' })) // invalidate specific planet data
```

## Calling Clients

Use `.call` to call a procedure client directly. It's an alias for corresponding procedure client.

```ts
const planet = await orpc.planet.find.call({ id: 123 })
```

## Operation Context

When clients are invoked through the SWR integration, an **operation context** is automatically added to the [client context](/docs/client/rpc-link#using-client-context). This context can be used to configure the request behavior, like setting the HTTP method.

```ts
import {
  SWR_OPERATION_CONTEXT_SYMBOL,
  SWROperationContext,
} from '@orpc/experimental-react-swr'

interface ClientContext extends SWROperationContext {
}

const GET_OPERATION_TYPE = new Set(['fetcher', 'subscriber', 'liveSubscriber'])

const link = new RPCLink<ClientContext>({
  url: 'http://localhost:3000/rpc',
  method: ({ context }, path) => {
    const operationType = context[SWR_OPERATION_CONTEXT_SYMBOL]?.type

    if (operationType && GET_OPERATION_TYPE.has(operationType)) {
      return 'GET'
    }

    return 'POST'
  },
})
```
