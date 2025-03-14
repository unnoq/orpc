---
title: Event Iterator in oRPC Clients
description: Learn how to use event iterators in oRPC clients.
---

# Event Iterator in oRPC Clients

An [Event Iterator](/docs/event-iterator) in oRPC behaves like an [AsyncGenerator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator).
Simply iterate over it and await each event.

## Basic Usage

```ts twoslash
import { ContractRouterClient, eventIterator, oc } from '@orpc/contract'
import { z } from 'zod'

const contract = {
  streaming: oc.output(eventIterator(z.object({ message: z.string() })))
}

declare const client: ContractRouterClient<typeof contract>
// ---cut---
const iterator = await client.streaming()

for await (const event of iterator) {
  console.log(event.message)
}
```

## Stopping the Stream Manually

Call `.return()` on the iterator to gracefully end the stream.

```ts
const iterator = await client.streaming()

for await (const event of iterator) {
  if (wantToStop) {
    await iterator.return()
    break
  }

  console.log(event.message)
}
```

## Error Handling

If an error occurs during streaming, oRPC will attempt retries based on your configuration. It can retry multiple times until the specified limit is reached, after which the error will be thrown.

::: info
If you're using [RPCLink](/docs/client/rpc-link), you can customize the retry behavior [here](/docs/client/rpc-link#event-iterator-configuration).
:::

```ts
const iterator = await client.streaming()

try {
  for await (const event of iterator) {
    console.log(event.message)
  }
}
catch (error) {
  if (error instanceof ORPCError) {
    // Handle the error here
  }
}
```

::: info
Errors thrown by the server can be instances of `ORPCError`.
:::

## Connection Status

Combine with `onEventIteratorStatusChange` to track the connection status of the event iterator.

```ts twoslash
declare const client: { streaming: () => Promise<AsyncGenerator<{ message: string }, void, void>> }
// ---cut---
import { onEventIteratorStatusChange } from '@orpc/client'

let status: 'connecting' | 'error' | 'reconnecting' | 'connected' | 'closed' = 'connecting'
let unsubscribe: (() => void) | undefined

try {
  const iterator = await client.streaming()

  unsubscribe = onEventIteratorStatusChange(iterator, (newStatus) => {
    status = newStatus
  })

  for await (const event of iterator) {
    console.log(event.message)
  }
}
catch (error) {
  status = 'error'
}
finally {
  unsubscribe?.()
}
```
