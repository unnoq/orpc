import '~/polyfill'

import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { ZodSmartCoercionPlugin, ZodToJsonSchemaConverter } from '@orpc/zod'
import { createServerFileRoute } from '@tanstack/react-start/server'
import { router } from '~/router/index'
import { onError } from '@orpc/server'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'

const handler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
  plugins: [
    new ZodSmartCoercionPlugin(),
    new OpenAPIReferencePlugin({
      schemaConverters: [
        new ZodToJsonSchemaConverter(),
      ],
      specGenerateOptions: {
        info: {
          title: 'ORPC Playground',
          version: '1.0.0',
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
