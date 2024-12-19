import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE } from '../procedure'
import type { FetchHandler } from './types'
import { executeWithHooks, ORPC_PROTOCOL_HEADER, ORPC_PROTOCOL_VALUE, trim, value } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { ORPCDeserializer, ORPCSerializer } from '@orpc/transformer'
import { unlazy } from '../lazy'
import { isProcedure } from '../procedure'
import { createProcedureCaller } from '../procedure-caller'
import { type ANY_ROUTER, getRouterChild } from '../router'

const serializer = new ORPCSerializer()
const deserializer = new ORPCDeserializer()

export function createORPCHandler(): FetchHandler {
  return async (options) => {
    if (!options.request.headers.get(ORPC_PROTOCOL_HEADER)?.includes(ORPC_PROTOCOL_VALUE)) {
      return undefined
    }

    const context = await value(options.context)

    const handler = async () => {
      const url = new URL(options.request.url)
      const pathname = `/${trim(url.pathname.replace(options.prefix ?? '', ''), '/')}`

      const match = await resolveRouterMatch(options.router, pathname)

      if (!match) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      const input = await parseRequestInput(options.request)

      const caller = createProcedureCaller({
        context,
        procedure: match.procedure,
        path: match.path,
      })

      const output = await caller(input, { signal: options.signal })

      const { body, headers } = serializer.serialize(output)

      return new Response(body, {
        status: 200,
        headers,
      })
    }

    try {
      return await executeWithHooks({
        hooks: options,
        context: context as any,
        execute: handler,
        input: options.request,
        meta: {
          signal: options.signal,
        },
      })
    }
    catch (error) {
      return handleErrorResponse(error)
    }
  }
}

async function resolveRouterMatch(
  router: ANY_ROUTER,
  pathname: string,
): Promise<{
  path: string[]
  procedure: ANY_PROCEDURE | ANY_LAZY_PROCEDURE
} | undefined> {
  const pathSegments = trim(pathname, '/').split('/').map(decodeURIComponent)

  const match = getRouterChild(router, ...pathSegments)
  const { default: maybeProcedure } = await unlazy(match)

  if (!isProcedure(maybeProcedure)) {
    return undefined
  }

  return {
    procedure: maybeProcedure,
    path: pathSegments,
  }
}

async function parseRequestInput(request: Request): Promise<unknown> {
  try {
    return await deserializer.deserialize(request)
  }
  catch (error) {
    throw new ORPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot parse request. Please check the request body and Content-Type header.',
      cause: error,
    })
  }
}

function handleErrorResponse(error: unknown): Response {
  const orpcError = error instanceof ORPCError
    ? error
    : new ORPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      cause: error,
    })

  const { body, headers } = serializer.serialize(orpcError.toJSON())

  return new Response(body, {
    status: orpcError.status,
    headers,
  })
}
