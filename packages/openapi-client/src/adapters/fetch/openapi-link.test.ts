import { createORPCClient } from '@orpc/client'
import { os } from '@orpc/server'
import { OpenAPIHandler } from '../../../../openapi/src/adapters/fetch/openapi-handler'
import { OpenAPILink } from './openapi-link'

describe('openAPILink', () => {
  const date = new Date()
  const blob = new Blob(['hello'], { type: 'text/plain' })

  const router = {
    GET: os.route({ method: 'GET', path: '/ping/{pong}' }).handler(({ input }) => input),
    POST: os.handler(({ input }) => input),
  }

  const handler = new OpenAPIHandler(router, {})

  const link = new OpenAPILink(router, {
    url: 'http://localhost:3000/api',
    fetch: async (request) => {
      const { matched, response } = await handler.handle(request, {
        prefix: '/api',
      })

      if (matched) {
        return response
      }

      throw new Error('No procedure match')
    },
  })

  const client = createORPCClient(link) as any

  it('method: GET', async () => {
    expect(await client.GET({
      pong: 'pong',
      a: 1,
      b: 2,
      nested: {
        date,
        arr: [3, date],
      },
    })).toEqual({
      pong: 'pong',
      a: '1',
      b: '2',
      nested: {
        date: date.toISOString(),
        arr: ['3', date.toISOString()],
      },
    })
  })

  it('method: POST', async () => {
    expect(await client.POST({
      a: 1,
      b: 2,
      nested: {
        date,
        arr: [3, date],
      },
    })).toEqual({
      a: 1,
      b: 2,
      nested: {
        date: date.toISOString(),
        arr: [3, date.toISOString()],
      },
    })
  })

  it('method: POST with blob', async () => {
    expect(await client.POST({
      a: 1,
      b: 2,
      nested: {
        date,
        arr: [3, date],
      },
      blob,
    })).toEqual({
      a: '1',
      b: '2',
      nested: {
        date: date.toISOString(),
        arr: ['3', date.toISOString()],
      },
      blob: expect.any(File),
    })
  })

  it('method: POST with blob in root', async () => {
    expect(await client.POST({
      blob,
    })).toEqual({
      blob: expect.any(File),
    })
  })
})
