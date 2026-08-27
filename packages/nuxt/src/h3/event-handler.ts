import type { Context } from '@orpc/server'
import type { FetchHandler } from '@orpc/server/fetch'
import type { FriendlyStandardHandlerHandleOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions, Promisable, Value } from '@orpc/shared'
import type { EventHandler, H3Event } from 'h3'
import { resolveMaybeOptionalOptions, value } from '@orpc/shared'
import * as h3 from 'h3'

export type ORPCEventHandlerOptions<T extends Context>
  = & Omit<FriendlyStandardHandlerHandleOptions<T>, 'context'>
    & (
      object extends T
        ? { context?: Value<Promisable<T>, [H3Event]> }
        : { context: Value<Promisable<T>, [H3Event]> }
    )

/**
 * Creates an H3 event handler that serves an oRPC handler,
 * for use inside Nuxt server routes or any H3-based server.
 *
 * Requests that do not match any procedure resolve with a `404 Not Found` response.
 *
 * @see {@link https://orpc.dev/docs/integrations/nuxt#server-routes | Nuxt Integration - Server Routes}
 */
export function defineORPCEventHandler<T extends Context>(
  handler: FetchHandler<T>,
  ...rest: MaybeOptionalOptions<ORPCEventHandlerOptions<T>>
): EventHandler {
  const { context, ...options } = resolveMaybeOptionalOptions(rest)

  return h3.defineEventHandler(async (event) => {
    /**
     * h3 v2 exposes the web Request directly on the event,
     * while h3 v1 requires converting the Node request.
     */
    const request: Request = (event as any).req instanceof Request
      ? (event as any).req
      : (h3 as any).toWebRequest(event)

    const { matched, response } = await handler.handle(request, {
      ...options,
      context: context === undefined
        ? {} as T
        : await value(context as Value<Promisable<T>, [H3Event]>, event),
    } as FriendlyStandardHandlerHandleOptions<T>)

    if (matched) {
      return response
    }

    return new Response('Not Found', { status: 404 })
  })
}
