import { RPCHandler } from '@orpc/server/fetch'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { experimental_SmartCoercionPlugin as SmartCoercionPlugin } from '@orpc/json-schema'
import { upgradeDurableEventIteratorRequest } from '@orpc/experimental-durable-event-iterator/durable-object'
import { BatchHandlerPlugin } from '@orpc/server/plugins'
import { router } from './router'
import { onError } from '@orpc/client'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { NewUserSchema, UserSchema } from './schemas/user'
import { CredentialSchema, TokenSchema } from './schemas/auth'
import { NewPlanetSchema, PlanetSchema, UpdatePlanetSchema } from './schemas/planet'
import { DurableEventIteratorHandlerPlugin } from '@orpc/experimental-durable-event-iterator'

const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new BatchHandlerPlugin(),
    new DurableEventIteratorHandlerPlugin(),
  ],
})

const openAPIHandler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new SmartCoercionPlugin({
      schemaConverters: [
        new ZodToJsonSchemaConverter(),
      ],
    }),
    new OpenAPIReferencePlugin({
      schemaConverters: [
        new ZodToJsonSchemaConverter(),
      ],
      specGenerateOptions: {
        info: {
          title: 'ORPC Playground',
          version: '1.0.0',
        },
        commonSchemas: {
          NewUser: { schema: NewUserSchema },
          User: { schema: UserSchema },
          Credential: { schema: CredentialSchema },
          Token: { schema: TokenSchema },
          NewPlanet: { schema: NewPlanetSchema },
          UpdatePlanet: { schema: UpdatePlanetSchema },
          Planet: { schema: PlanetSchema },
          UndefinedError: { error: 'UndefinedError' },
        },
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      },
      docsConfig: {
        authentication: {
          securitySchemes: {
            bearerAuth: {
              token: 'default-token',
            },
          },
        },
      },
    }),
  ],
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/chat-room') {
      return upgradeDurableEventIteratorRequest(request, {
        signingKey: 'key',
        namespace: env.CHAT_ROOM,
      })
    }

    const rpcResult = await rpcHandler.handle(request, {
      prefix: '/rpc',
      context: {
        env,
      },
    })

    if (rpcResult.matched) {
      return rpcResult.response
    }

    const apiResult = await openAPIHandler.handle(request, {
      prefix: '/api',
      context: {
        env,
      },
    })

    if (apiResult.matched) {
      return apiResult.response
    }

    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

export { ChatRoom } from './dos/chat-room'
