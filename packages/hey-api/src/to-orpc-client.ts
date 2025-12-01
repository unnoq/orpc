import type { Client, ThrowableError } from '@orpc/client'

export type experimental_ToORPCClientResult<T extends Record<string, any>> = {
  [K in keyof T]:
  T[K] extends (options: infer UInput)
  => Promise<infer UResult>
    ? Client<Record<never, never>, UInput, {
      body: UResult extends { data: infer USuccess } ? Exclude<USuccess, undefined> : never
      request: Request
      response: Response
    }, ThrowableError>
    : T[K] extends Record<string, any>
      ? experimental_ToORPCClientResult<T[K]>
      : never
}

/**
 * Convert a Hey API SDK to an oRPC client.
 *
 * @see {@link https://orpc.dev/docs/integrations/hey-api Hey API Docs}
 */
export function experimental_toORPCClient<T extends Record<string, any>>(sdk: T): experimental_ToORPCClientResult<T> {
  const client = {} as Record<string, Client<Record<never, never>, undefined | Record<any, any>, any, any>>

  for (const key in sdk) {
    const fn = sdk[key]

    if (!fn || typeof fn !== 'function') {
      continue
    }

    client[key] = async (input, options) => {
      const controller = new AbortController()

      if (input?.signal?.aborted || options?.signal?.aborted) {
        controller.abort()
      }
      else {
        input?.signal?.addEventListener('abort', () => controller.abort())
        options?.signal?.addEventListener('abort', () => controller.abort())
      }

      const result = await fn({
        ...input,
        signal: controller.signal,
        headers: {
          ...input?.headers,
          ...typeof options?.lastEventId === 'string' ? { 'last-event-id': options.lastEventId } : {},
        },
        throwOnError: true,
      })

      return {
        body: result.data,
        request: result.request,
        response: result.response,
      }
    }
  }

  return client as experimental_ToORPCClientResult<T>
}
