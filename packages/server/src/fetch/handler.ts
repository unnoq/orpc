import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE } from '../procedure'
import type { Router } from '../router'
import type { FetchHandler } from './types'
import { ORPC_HEADER, ORPC_HEADER_VALUE } from '@orpc/contract'
import { trim, value } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { ORPCDeserializer, ORPCSerializer } from '@orpc/transformer'
import { isLazy } from '../lazy'
import { isProcedure } from '../procedure'
import { createProcedureCaller } from '../procedure-caller'

const serializer = new ORPCSerializer()
const deserializer = new ORPCDeserializer()

export function createORPCHandler(): FetchHandler {
  return async (options) => {
    if (options.request.headers.get(ORPC_HEADER) !== ORPC_HEADER_VALUE) {
      return undefined
    }

    const context = await value(options.context)

    const handler = async () => {
      const url = new URL(options.request.url)
      const pathname = `/${trim(url.pathname.replace(options.prefix ?? '', ''), '/')}`

      const match = resolveORPCRouter(options.router, pathname)

      if (!match) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      const input = await deserializeRequest(options.request)

      const caller = createProcedureCaller({
        context,
        procedure: match.procedure as any,
        path: match.path,
      })

      const output = await caller(input)

      const { body, headers } = serializer.serialize(output)

      return new Response(body, {
        status: 200,
        headers,
      })
    }

    try {
      return await options.hooks?.(
        context as any,
        { next: handler, response: response => response },
      ) ?? await handler()
    }
    catch (e) {
      const error = e instanceof ORPCError
        ? e
        : new ORPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          cause: e,
        })

      const { body, headers } = serializer.serialize(error.toJSON())

      return new Response(body, {
        status: error.status,
        headers,
      })
    }
  }
}

function resolveORPCRouter(router: Router<any>, pathname: string): {
  path: string[]
  procedure: ANY_PROCEDURE | ANY_LAZY_PROCEDURE
} | undefined {
  const path = trim(pathname, '/').split('/').map(decodeURIComponent)

  let current: Router<any> | ANY_PROCEDURE | ANY_LAZY_PROCEDURE | undefined = router
  for (const segment of path) {
    if ((typeof current !== 'object' && typeof current !== 'function') || !current) {
      current = undefined
      break
    }

    current = (current as any)[segment]
  }

  return isProcedure(current) || isLazy(current)
    ? {
        procedure: current,
        path,
      }
    : undefined
}

async function deserializeRequest(request: Request): Promise<unknown> {
  try {
    return await deserializer.deserialize(request)
  }
  catch (e) {
    throw new ORPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot parse request. Please check the request body and Content-Type header.',
      cause: e,
    })
  }
}
