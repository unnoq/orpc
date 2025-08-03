---
title: Cookie Helpers
description: Functions for managing HTTP cookies in web applications.
---

# Cookie Helpers

The Cookie helpers provide functions to set and get HTTP cookies.

```ts twoslash
import { deleteCookie, getCookie, setCookie } from '@orpc/server/helpers'

const reqHeaders = new Headers()
const resHeaders = new Headers()

setCookie(resHeaders, 'sessionId', 'abc123', {
  secure: true,
  maxAge: 3600
})

deleteCookie(resHeaders, 'sessionId')

const sessionId = getCookie(reqHeaders, 'sessionId')
```

::: info
Both helpers accept `undefined` as headers for seamless integration with plugins like [Request Headers](/docs/plugins/request-headers) or [Response Headers](/docs/plugins/response-headers).
:::

## Security with Signing and Encryption

Combine cookies with [signing](/docs/helpers/signing) or [encryption](/docs/helpers/encryption) for enhanced security:

```ts twoslash
import { getCookie, setCookie, sign, unsign } from '@orpc/server/helpers'

const secret = 'your-secret-key'

const reqHeaders = new Headers()
const resHeaders = new Headers()

setCookie(resHeaders, 'sessionId', await sign('abc123', secret), {
  httpOnly: true,
  secure: true,
  maxAge: 3600
})

const signedSessionId = await unsign(getCookie(reqHeaders, 'sessionId'), secret)
```
