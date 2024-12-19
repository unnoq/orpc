import type { Context } from '../types'
import type { FetchHandler, FetchHandlerOptions } from './types'
import { ORPCError } from '@orpc/shared/error'

export type HandleFetchRequestOptions<T extends Context> = FetchHandlerOptions<T> & {
  handlers: readonly [FetchHandler, ...FetchHandler[]]
}

export async function handleFetchRequest<T extends Context>(
  options: HandleFetchRequestOptions<T>,
) {
  for (const handler of options.handlers) {
    const response = await handler(options)

    if (response) {
      return response
    }
  }

  const error = new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })

  return new Response(JSON.stringify(error.toJSON()), {
    status: error.status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
