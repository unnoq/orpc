---
title: Signing Helpers
description: Functions to cryptographically sign and verify data using HMAC-SHA256.
---

# Signing Helpers

Signing helpers provide functions to cryptographically sign and verify data using HMAC-SHA256.

::: info
Signing is faster than [encryption](/docs/helpers/encryption) but users can view the original data.
:::

```ts twoslash
import { getSignedValue, sign, unsign } from '@orpc/server/helpers'

const secret = 'your-secret-key'
const userData = 'user123'

const signedValue = await sign(userData, secret)
// 'user123.oneQsU0r5dvwQFHFEjjV1uOI_IR3gZfkYHij3TRauVA'
// ↑ Original data is visible to users

const verifiedValue = await unsign(signedValue, secret) // 'user123'

// Extract value without verification
const extractedValue = getSignedValue(signedValue) // 'user123'
```

::: info
The `unsign` and `getSignedValue` helpers accept `undefined` or `null` as signed value and return `undefined` for invalid inputs, enabling seamless handling of optional data.
:::
