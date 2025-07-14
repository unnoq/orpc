import '~/polyfill'

import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { experimental_SmartCoercionPlugin as SmartCoercionPlugin } from '@orpc/json-schema'
import { createServerFileRoute } from '@tanstack/react-start/server'
import { router } from '~/router/index'
import { onError } from '@orpc/server'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { NewUserSchema, UserSchema } from '~/schemas/user'
import { CredentialSchema, TokenSchema } from '~/schemas/auth'
import { NewPlanetSchema, PlanetSchema, UpdatePlanetSchema } from '~/schemas/planet'

const handler = new OpenAPIHandler(router, {
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

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api',
    context: {},
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const ServerRoute = createServerFileRoute('/api/$').methods({
  HEAD: handle,
  GET: handle,
  POST: handle,
  PUT: handle,
  PATCH: handle,
  DELETE: handle,
})
