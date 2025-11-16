---
title: Expanding Type Support for OpenAPI Link
description: Learn how to extend OpenAPILink to support additional data types beyond JSON's native capabilities using the Response Validation Plugin and schema coercion.
---

# Expanding Type Support for OpenAPI Link

This guide will show you how to extend [OpenAPILink](/docs/openapi/client/openapi-link) to support additional data types beyond JSON's native capabilities using the [Response Validation Plugin](/docs/plugins/response-validation).

## How It Works

To enable this functionality, you need to extend your [output](/docs/procedure#input-output-validation) and [error](/docs/error-handling#type%E2%80%90safe-error-handling) schemas with proper coercion logic.

**Why?** OpenAPI response data only represents JSON's native capabilities. We use schema coercion logic in contract's schemas to convert the data to the desired type.

::: warning
Beyond JSON limitations, outputs containing `Blob` or `File` types (outside the root level) also face [Bracket Notation](/docs/openapi/bracket-notation#limitations) limitations.
:::

```ts
const contract = oc.output(z.object({
  date: z.coerce.date<Date>(), // [!code highlight]
  bigint: z.coerce.bigint<bigint>(), // [!code highlight]
}))

const procedure = implement(contract).handler(() => ({
  date: new Date(),
  bigint: 123n,
}))
```

On the client side, you'll receive the output like this:

```ts
const beforeValidation = {
  date: '2025-09-01T07:24:39.000Z',
  bigint: '123'
}
```

Since your output schema contains coercion logic, the Response Validation Plugin will convert the data to the desired type after validation.

```ts
const afterValidation = {
  date: new Date('2025-09-01T07:24:39.000Z'),
  bigint: 123n
}
```

::: warning
To support more types than those in [OpenAPI Handler](/docs/openapi/openapi-handler#supported-data-types), you must first extend the [OpenAPI JSON Serializer](/docs/openapi/advanced/openapi-json-serializer) first.
:::

## Setup

After understanding how it works and expanding schemas with coercion logic, you only need to set up the [Response Validation Plugin](/docs/plugins/response-validation) and remove the `JsonifiedClient` wrapper.

```diff
 import type { ContractRouterClient } from '@orpc/contract'
 import { createORPCClient } from '@orpc/client'
 import { OpenAPILink } from '@orpc/openapi-client/fetch'
 import { ResponseValidationPlugin } from '@orpc/contract/plugins'

 const link = new OpenAPILink(contract, {
   url: 'http://localhost:3000/api',
   plugins: [
+    new ResponseValidationPlugin(contract),
   ]
 })

-const client: JsonifiedClient<ContractRouterClient<typeof contract>> = createORPCClient(link)
+const client: ContractRouterClient<typeof contract> = createORPCClient(link)
```
