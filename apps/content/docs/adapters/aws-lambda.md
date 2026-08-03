# AWS Lambda Adapter

oRPC supports [AWS Lambda](https://aws.amazon.com/lambda/) behind [API Gateway](https://aws.amazon.com/api-gateway/) (payload format 1.0 and 2.0) and [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html).

::: warning
This adapter requires the Lambda Node.js runtime with [response streaming](https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html) enabled, so handlers must be wrapped with `awslambda.streamifyResponse`.
:::

## Server Usage

::: code-group

```ts [RPC]
import type { APIGatewayProxyEventV2, AwsLambdaGlobal } from '@standardserver/aws-lambda'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/aws-lambda'
import { CORSHandlerPlugin } from '@orpc/server/plugins'

declare const awslambda: AwsLambdaGlobal

const handler = new RPCHandler(router, {
  plugins: [
    new CORSHandlerPlugin()
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

export const rpc = awslambda.streamifyResponse<APIGatewayProxyEventV2>(async (event, responseStream, context) => {
  const { matched } = await handler.handle(event, responseStream, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return
  }

  awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 404,
    headers: {},
    cookies: [],
  }).end('Not found')
})
```

```ts [OpenAPI]
import type { APIGatewayProxyEventV2, AwsLambdaGlobal } from '@standardserver/aws-lambda'
import { OpenAPIHandler } from '@orpc/openapi/aws-lambda'
import { onError } from '@orpc/server'
import { CORSHandlerPlugin } from '@orpc/server/plugins'

declare const awslambda: AwsLambdaGlobal

const handler = new OpenAPIHandler(router, {
  plugins: [
    new CORSHandlerPlugin()
  ],
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

export const api = awslambda.streamifyResponse<APIGatewayProxyEventV2>(async (event, responseStream, context) => {
  const { matched } = await handler.handle(event, responseStream, {
    prefix: '/api',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return
  }

  awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 404,
    headers: {},
    cookies: [],
  }).end('Not found')
})
```

:::

<!--@include: @/shared/standard-server-cors-warning.md -->

## Event Stream Options

You can configure how an [AsyncIteratorObject](/docs/async-iterator-object) is streamed to the client using the `sendStandardResponse.eventStream` options when creating the handler.

```ts
const handler = new OpenAPIHandler(router, {
  sendStandardResponse: {
    eventStream: {
      initialComment: {
        /**
         * If true, an initial comment is sent immediately upon stream start to flush headers.
         * This allows the receiving side to establish the connection without waiting for the first event.
         *
         * @default true
         */
        enabled: true,
        /**
         * The content of the initial comment sent upon stream start. Must not include newline characters.
         *
         * @default ''
         */
        comment: '',
      },
      keepAlive: {
        /**
         * If true, a ping comment is sent periodically to keep the connection alive.
         *
         * @default true
         */
        enabled: true,
        /**
         * Interval (in milliseconds) between ping comments sent after the last event.
         *
         * @default 15000
         */
        interval: 15000,
        /**
         * The content of the ping comment. Must not include newline characters.
         *
         * @default ''
         */
        comment: '',
      },
      /**
       * If true, a `close` event is sent even when the iterator completes with `undefined`.
       * When the iterator returns a value, a `close` event is always emitted regardless of this setting.
       *
       * @default true
       */
      emptyCloseEventEnabled: true,
    },
  },
})
```
