import { createServer } from 'node:http'
import { generateOpenAPI } from '@orpc/openapi'
import { createOpenAPIServerHandler } from '@orpc/openapi/fetch'
import { createORPCHandler, handleFetchRequest } from '@orpc/server/fetch'
import { createServerAdapter } from '@whatwg-node/server'
import { router } from './router'
import './polyfill'

const server = createServer(
  createServerAdapter(async (request: Request) => {
    const url = new URL(request.url)

    const context = request.headers.get('Authorization')
      ? { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }
      : {}

    if (url.pathname.startsWith('/api')) {
      return handleFetchRequest({
        request,
        prefix: '/api',
        context,
        router,
        handlers: [createORPCHandler(), createOpenAPIServerHandler()],
        onError: ({ error }) => {
          console.error(error)
        },
      })
    }

    if (url.pathname === '/spec.json') {
      const spec = await generateOpenAPI({
        router,
        info: {
          title: 'ORPC Playground',
          version: '1.0.0',
          description: `
The example OpenAPI Playground for ORPC.

## Resources

* [Github](https://github.com/unnoq/orpc)
* [Documentation](https://orpc.unnoq.com)
          `,
        },
        servers: [
          { url: '/api' /** Should use absolute URLs in production */ },
        ],
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      })

      return new Response(JSON.stringify(spec), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    return new Response(
      `
        <!doctype html>
        <html>
        <head>
            <title>ORPC Playground</title>
            <meta charset="utf-8" />
            <meta
            name="viewport"
            content="width=device-width, initial-scale=1" />

            <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
        </head>
        <body>
            <script
            id="api-reference"
            data-url="/spec.json"
            data-configuration="${JSON.stringify({
              authentication: {
                preferredSecurityScheme: 'bearerAuth',
                http: {
                  bearer: {
                    token: 'default-token',
                  },
                },
              },
            }).replaceAll('"', '&quot;')}"
            ></script>

            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
        </body>
        </html>
    `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      },
    )
  }),
)

server.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Playground is available at http://localhost:3000')
})
