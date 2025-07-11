---
title: Error Handling in oRPC Clients
description: Learn how to handle errors in a type-safe way in oRPC clients.
---

# Error Handling in oRPC Clients

This guide explains how to handle type-safe errors in oRPC clients using [type-safe error handling](/docs/error-handling#type‐safe-error-handling). Both [server-side](/docs/client/server-side) and [client-side](/docs/client/client-side) clients are supported.

## Using `safe` and `isDefinedError`

```ts twoslash
import { os } from '@orpc/server'
import { z } from 'zod'
// ---cut---
import { isDefinedError, safe } from '@orpc/client'

const doSomething = os
  .input(z.object({ id: z.string() }))
  .errors({
    RATE_LIMIT_EXCEEDED: {
      data: z.object({ retryAfter: z.number() })
    }
  })
  .handler(async ({ input, errors }) => {
    throw errors.RATE_LIMIT_EXCEEDED({ data: { retryAfter: 1000 } })

    return { id: input.id }
  })
  .callable()

const [error, data, isDefined] = await safe(doSomething({ id: '123' }))
// or const { error, data, isDefined } = await safe(doSomething({ id: '123' }))

if (isDefinedError(error)) { // or isDefined
  // handle known error
  console.log(error.data.retryAfter)
}
else if (error) {
  // handle unknown error
}
else {
  // handle success
  console.log(data)
}
```

:::info

- `safe` works like `try/catch`, but can infer error types.
- `safe` supports both tuple `[error, data, isDefined]` and object `{ error, data, isDefined }` styles.
- `isDefinedError` checks if an error originates from `.errors`.
- `isDefined` can replace `isDefinedError`

:::

## Safe Client

If you often use `safe` for error handling, `createSafeClient` can simplify your code by automatically wrapping all procedure calls with `safe`. It works with both [server-side](/docs/client/server-side) and [client-side](/docs/client/client-side) clients.

```ts
import { createSafeClient } from '@orpc/client'

const safeClient = createSafeClient(client)

const [error, data] = await safeClient.doSomething({ id: '123' })
```
