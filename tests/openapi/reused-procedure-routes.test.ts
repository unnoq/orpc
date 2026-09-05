import type { RouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { openapi, OpenAPIGenerator } from '@orpc/openapi'
import { OpenAPIHandler, OpenAPILink } from '@orpc/openapi/fetch'
import { os } from '@orpc/server'
import { z } from 'zod'

/**
 * One procedure exposed under several routes, where each route promotes a different optional
 * field to a path param. Covers https://github.com/middleapi/orpc/issues/513.
 */
describe('one procedure reused under multiple routes with optional path params', () => {
  const listComments = os
    .meta(openapi({ method: 'GET', path: '/comments', tags: ['admin'] }))
    .input(z.object({
      user: z.union([z.literal('me'), z.coerce.number()]).optional(),
      tasting: z.coerce.number().optional(),
      cursor: z.coerce.number().gte(1).default(1),
      limit: z.coerce.number().gte(1).lte(100).default(100),
    }))
    .handler(async ({ input }) => input)

  const router = {
    admin: { listComments },
    tastings: {
      listComments: listComments.meta(openapi({ path: '/tastings/{tasting}/comments', tags: ['tastings'] })),
    },
    users: {
      listComments: listComments.meta(openapi({ path: '/users/{user}/comments', tags: ['users'] })),
    },
  }

  describe('handler', () => {
    const handler = new OpenAPIHandler(router)

    it.each([
      ['/comments?limit=5', { cursor: 1, limit: 5 }],
      ['/comments?tasting=42&user=me', { tasting: 42, user: 'me', cursor: 1, limit: 100 }],
      ['/tastings/42/comments', { tasting: 42, cursor: 1, limit: 100 }],
      ['/users/me/comments?cursor=2', { user: 'me', cursor: 2, limit: 100 }],
      ['/users/7/comments', { user: 7, cursor: 1, limit: 100 }],
    ])('routes GET %s to the shared handler with %o', async (path, expected) => {
      const { matched, response } = await handler.handle(new Request(`https://example.com${path}`))

      expect(matched).toBe(true)
      expect(response!.status).toBe(200)
      await expect(response!.json()).resolves.toEqual(expected)
    })
  })

  describe('link', () => {
    const handler = new OpenAPIHandler(router)
    const requests: string[] = []

    const link = new OpenAPILink(router, {
      url: '/',
      origin: 'https://example.com',
      async fetch(url, init) {
        const request = new Request(url, init)
        const { pathname, search } = new URL(request.url)
        requests.push(`${request.method} ${pathname}${search}`)
        const { response } = await handler.handle(request)
        return response ?? new Response('Not Found', { status: 404 })
      },
    })

    const client = createORPCClient<RouterClient<typeof router>>(link)

    beforeEach(() => {
      requests.length = 0
    })

    it('sends every field as a query param on the route without path params', async () => {
      await expect(client.admin.listComments({ tasting: 42, limit: 5 })).resolves.toEqual({ tasting: 42, cursor: 1, limit: 5 })
      expect(requests).toEqual(['GET /comments?tasting=42&limit=5'])
    })

    it('promotes the field to the path segment on the routes that declare it', async () => {
      await expect(client.tastings.listComments({ tasting: 42 })).resolves.toEqual({ tasting: 42, cursor: 1, limit: 100 })
      await expect(client.users.listComments({ user: 'me', cursor: 2 })).resolves.toEqual({ user: 'me', cursor: 2, limit: 100 })
      expect(requests).toEqual(['GET /tastings/42/comments', 'GET /users/me/comments?cursor=2'])
    })

    it('rejects at runtime when the optional field backing a path param is omitted', async () => {
      await expect(client.tastings.listComments({})).rejects.toThrow('Path param "tasting" cannot be empty')
      expect(requests).toEqual([])
    })
  })

  describe('generator', () => {
    it('documents each route with its own path params and query params', async () => {
      const doc = await new OpenAPIGenerator().generate(router)

      expect(Object.keys(doc.paths ?? {})).toEqual(['/comments', '/tastings/{tasting}/comments', '/users/{user}/comments'])

      const paramNames = (path: `/${string}`) => doc.paths![path]!.get!.parameters!.map((p: any) => `${p.in}:${p.name}${p.required ? '!' : ''}`)

      expect(paramNames('/comments')).toEqual(['query:user', 'query:tasting', 'query:cursor', 'query:limit'])
      expect(paramNames('/tastings/{tasting}/comments')).toEqual(['path:tasting!', 'query:user', 'query:cursor', 'query:limit'])
      expect(paramNames('/users/{user}/comments')).toEqual(['path:user!', 'query:tasting', 'query:cursor', 'query:limit'])

      expect(doc.paths!['/comments']!.get!.tags).toEqual(['admin'])
      expect(doc.paths!['/tastings/{tasting}/comments']!.get!.tags).toEqual(['admin', 'tastings'])
      expect(doc.paths!['/users/{user}/comments']!.get!.tags).toEqual(['admin', 'users'])
      expect(doc.paths!['/tastings/{tasting}/comments']!.get!.operationId).toBe('tastings.listComments')
    })
  })
})
