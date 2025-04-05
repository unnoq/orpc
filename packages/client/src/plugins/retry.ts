import type { Value } from '@orpc/shared'
import type { StandardLinkInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '../adapters/standard'
import type { ClientContext } from '../types'
import { isAsyncIteratorObject, value } from '@orpc/shared'
import { getEventMeta } from '@orpc/standard-server'

export interface ClientRetryPluginAttemptOptions<T extends ClientContext> extends StandardLinkInterceptorOptions<T> {
  lastEventRetry: number | undefined
  attemptIndex: number
  error: unknown
}

export interface ClientRetryPluginContext {
  /**
   * Maximum retry attempts before throwing
   * Use `Number.POSITIVE_INFINITY` for infinite retries (e.g., when handling Server-Sent Events).
   *
   * @default 0
   */
  retry?: Value<number, [StandardLinkInterceptorOptions<ClientRetryPluginContext>]>

  /**
   * Delay (in ms) before retrying.
   *
   * @default (o) => o.lastEventRetry ?? 2000
   */
  retryDelay?: Value<number, [ClientRetryPluginAttemptOptions<ClientRetryPluginContext>]>

  /**
   * Determine should retry or not.
   *
   * @default true
   */
  shouldRetry?: Value<boolean, [ClientRetryPluginAttemptOptions<ClientRetryPluginContext>]>

  /**
   * The hook called when retrying, and return the unsubscribe function.
   */
  onRetry?: (options: ClientRetryPluginAttemptOptions<ClientRetryPluginContext>) => void | (() => void)
}

export class ClientRetryPluginInvalidEventIteratorRetryResponse extends Error { }

export interface ClientRetryPluginOptions {
  default?: ClientRetryPluginContext
}

export class ClientRetryPlugin<T extends ClientRetryPluginContext> implements StandardLinkPlugin<T> {
  private readonly defaultRetry: Exclude<ClientRetryPluginContext['retry'], undefined>
  private readonly defaultRetryDelay: Exclude<ClientRetryPluginContext['retryDelay'], undefined>
  private readonly defaultShouldRetry: Exclude<ClientRetryPluginContext['shouldRetry'], undefined>
  private readonly defaultOnRetry: ClientRetryPluginContext['onRetry']

  constructor(options: ClientRetryPluginOptions = {}) {
    this.defaultRetry = options.default?.retry ?? 0
    this.defaultRetryDelay = options.default?.retryDelay ?? (o => o.lastEventRetry ?? 2000)
    this.defaultShouldRetry = options.default?.shouldRetry ?? true
    this.defaultOnRetry = options.default?.onRetry
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []

    options.interceptors.push(async (interceptorOptions) => {
      const maxAttempts = await value(
        interceptorOptions.context.retry ?? this.defaultRetry,
        interceptorOptions,
      )

      const retryDelay = interceptorOptions.context.retryDelay ?? this.defaultRetryDelay
      const shouldRetry = interceptorOptions.context.shouldRetry ?? this.defaultShouldRetry
      const onRetry = interceptorOptions.context.onRetry ?? this.defaultOnRetry

      if (maxAttempts <= 0) {
        return interceptorOptions.next()
      }

      let lastEventId = interceptorOptions.lastEventId
      let lastEventRetry: undefined | number
      let unsubscribe: void | (() => void)
      let attemptIndex = 0

      const next = async (initial?: { error: unknown }) => {
        let current = initial

        while (true) {
          const updatedInterceptorOptions = { ...interceptorOptions, lastEventId }

          if (current) {
            if (attemptIndex >= maxAttempts) {
              throw current.error
            }

            const attemptOptions: ClientRetryPluginAttemptOptions<ClientRetryPluginContext> = {
              ...updatedInterceptorOptions,
              attemptIndex,
              error: current.error,
              lastEventRetry,
            }

            const shouldRetryBool = await value(
              shouldRetry,
              attemptOptions,
            )

            if (!shouldRetryBool) {
              throw current.error
            }

            unsubscribe = onRetry?.(attemptOptions)

            const retryDelayMs = await value(retryDelay, attemptOptions)

            await new Promise(resolve => setTimeout(resolve, retryDelayMs))

            attemptIndex++
          }

          try {
            return await interceptorOptions.next(updatedInterceptorOptions)
          }
          catch (error) {
            if (updatedInterceptorOptions.signal?.aborted === true) {
              throw error
            }

            current = { error }
          }
          finally {
            unsubscribe?.()
            unsubscribe = undefined
          }
        }
      }

      const output = await next()

      if (!isAsyncIteratorObject(output)) {
        return output
      }

      return (async function* () {
        let current = output

        try {
          while (true) {
            try {
              const item = await current.next()

              const meta = getEventMeta(item.value)
              lastEventId = meta?.id ?? lastEventId
              lastEventRetry = meta?.retry ?? lastEventRetry

              if (item.done) {
                return item.value
              }

              yield item.value
            }
            catch (error) {
              const meta = getEventMeta(error)
              lastEventId = meta?.id ?? lastEventId
              lastEventRetry = meta?.retry ?? lastEventRetry

              const maybeEventIterator = await next({ error })

              if (!isAsyncIteratorObject(maybeEventIterator)) {
                throw new ClientRetryPluginInvalidEventIteratorRetryResponse(
                  'RetryPlugin: Expected an Event Iterator, got a non-Event Iterator',
                )
              }

              current = maybeEventIterator
            }
          }
        }
        finally {
          await current.return?.()
        }
      })()
    })
  }
}
