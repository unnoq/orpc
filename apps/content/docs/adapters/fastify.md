# Fastify Adapter

oRPC supports [Fastify](https://fastify.dev/) servers out of the box.

## Server Usage

::: code-group

```ts [RPC]
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fastify'
import { CORSHandlerPlugin } from '@orpc/server/plugins'
import Fastify from 'fastify'

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

const app = Fastify()

app.all('/rpc/*', async (req, reply) => {
  const { matched } = await handler.handle(req, reply, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return reply
  }

  return reply.status(404).send('Not found')
})

app.listen({ port: 3000 }).then(() => console.log('Listening on port 3000'))
```

```ts [OpenAPI]
import { OpenAPIHandler } from '@orpc/openapi/fastify'
import { onError } from '@orpc/server'
import { CORSHandlerPlugin } from '@orpc/server/plugins'
import Fastify from 'fastify'

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

const app = Fastify()

app.all('/api/*', async (req, reply) => {
  const { matched } = await handler.handle(req, reply, {
    prefix: '/api',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return reply
  }

  return reply.status(404).send('Not found')
})

app.listen({ port: 3000 }).then(() => console.log('Listening on port 3000'))
```

:::

::: tip
Fastify only accepts content types it has a registered parser for, and parses request bodies itself. For the best oRPC experience, register a catch-all parser with `app.addContentTypeParser('*', ...)` so every content type is supported, and call `app.removeAllContentTypeParsers()` so every body is parsed by oRPC instead of Fastify:

```ts
// Optional, let oRPC parse all content types
app.removeAllContentTypeParsers()

// Optional, support all content types
app.addContentTypeParser('*', (request, payload, done) => {
  done(null, undefined)
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
