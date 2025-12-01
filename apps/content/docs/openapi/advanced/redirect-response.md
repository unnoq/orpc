---
title: Redirect Response
description: Standard HTTP redirect response in oRPC OpenAPI.
---

# Redirect Response

Easily return a standard HTTP redirect response in oRPC OpenAPI.

## Basic Usage

By combining the `successStatus` and `outputStructure` options, you can return a standard HTTP redirect response.

```ts
const redirect = os
  .route({
    method: 'GET',
    path: '/redirect',
    successStatus: 307, // [!code highlight]
    outputStructure: 'detailed' // [!code highlight]
  })
  .handler(async () => {
    return {
      headers: {
        location: 'https://orpc.dev', // [!code highlight]
      },
    }
  })
```

## Limitations

When invoking a redirect procedure with [OpenAPILink](/docs/openapi/client/openapi-link), oRPC treats the redirect as a normal response rather than following it. Some environments, such as browsers, may restrict access to the redirect response, **potentially causing errors**. In contrast, server environments like Node.js handle this without issue.
