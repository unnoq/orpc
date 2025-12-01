import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import type { Router } from '../router'
import { HibernationEventIterator } from '@orpc/standard-server'

export interface HibernationPluginContext {
  iterator?: HibernationEventIterator<any>
}

/**
 * Enable Hibernation APIs
 *
 * @see {@link https://orpc.dev/docs/plugins/hibernation Hibernation Plugin}
 */
export class HibernationPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_HIBERNATION_CONTEXT')

  order = 2_000_000 // make sure execute after the batch plugin

  init(options: StandardHandlerOptions<T>, _router: Router<any, T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.unshift(async (options) => {
      const hibernationContext: HibernationPluginContext = {}

      const result = await options.next({
        ...options,
        context: {
          ...options.context,
          [this.CONTEXT_SYMBOL]: hibernationContext,
        },
      })

      if (!result.matched || !hibernationContext.iterator) {
        return result
      }

      return {
        ...result,
        response: {
          ...result.response,
          body: hibernationContext.iterator,
        },
      }
    })

    options.clientInterceptors.unshift(async (options) => {
      const hibernationContext = options.context[this.CONTEXT_SYMBOL] as HibernationPluginContext | undefined

      if (!hibernationContext) {
        throw new TypeError('[HibernationPlugin] Hibernation context has been corrupted or modified by another plugin or interceptor')
      }

      const output = await options.next()

      if (output instanceof HibernationEventIterator) {
        hibernationContext.iterator = output
      }

      return output
    })
  }
}
