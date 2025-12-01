import { trace } from '@opentelemetry/api'
import { os } from '@orpc/server'

export function retry(options: { times: number }) {
  /**
   * Best practices for dedupe-middlewares
   * {@link https://orpc.dev/docs/best-practices/dedupe-middleware}
   */
  const middleware = os
    .$context<{ canRetry?: boolean }>()
    .middleware(({ context, next }) => {
      const canRetry = context.canRetry ?? true

      /**
       * Provides additional information for tracing in middleware span.
       */
      const span = trace.getActiveSpan()
      span?.setAttribute('middleware.retry.times', options.times)
      span?.setAttribute('middleware.retry.canRetry', canRetry)

      if (!canRetry) {
        return next()
      }

      let times = 0
      while (true) {
        try {
          return next({
            context: {
              canRetry: false,
            },
          })
        }
        catch (e) {
          if (times >= options.times) {
            throw e
          }

          times++
        }
      }
    })

  /**
   * Define the name of the middleware for better span naming and debugging.
   */
  Object.defineProperty(middleware, 'name', {
    value: 'retry',
  })

  return middleware
}
