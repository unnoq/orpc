# CORS Handler Plugin

Use `CORSHandlerPlugin` to configure [CORS Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) for your API.

## Basic

```ts twoslash
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './shared/planet'
// ---cut---
import { CORSHandlerPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSHandlerPlugin({
      origin: '*',
      allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
      // ...
    }),
  ],
})
```

## Origin

`origin` defaults to `*`, which allows any origin but forbids credentials. To send credentials, restrict `origin` to an allowlist or reflect the request origin, and enable `credentials`. A `Vary: Origin` header is added automatically whenever the allowed origin depends on the request.

```ts twoslash
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './shared/planet'
import { CORSHandlerPlugin } from '@orpc/server/plugins'
// ---cut---
const handler = new RPCHandler(router, {
  plugins: [
    new CORSHandlerPlugin({
      origin: ['https://example.com', 'https://app.example.com'],
      credentials: true,
    }),
  ],
})
```

<!--@include: @/shared/any-handler-support-info.md -->

<!--@include: @/shared/standard-server-cors-warning.md -->

## Learn More

For implementation details, see the [source code](https://github.com/middleapi/orpc/blob/main/packages/server/src/plugins/cors.ts).
