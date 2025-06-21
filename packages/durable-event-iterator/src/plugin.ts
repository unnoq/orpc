import type { Context, Router } from '@orpc/server'
import type { StandardHandlerOptions, StandardHandlerPlugin } from '@orpc/server/standard'
import { getJwtIfClientDurableEventIterator } from './client'
import { DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_VALUE } from './consts'

export interface DurableEventIteratorHandlerPluginContext {
  isClientDurableEventIteratorOutput?: boolean
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class DurableEventIteratorHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_EVENT_ITERATOR_HANDLER_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute after the batch plugin

  init(options: StandardHandlerOptions<T>, _router: Router<any, T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.unshift(async (options) => {
      const pluginContext: DurableEventIteratorHandlerPluginContext = {}

      const result = await options.next({
        ...options,
        context: {
          [this.CONTEXT_SYMBOL]: pluginContext,
          ...options.context,
        },
      })

      if (!result.matched) {
        return result
      }

      return {
        ...result,
        response: {
          ...result.response,
          headers: {
            ...result.response.headers,
            [DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_KEY]: pluginContext.isClientDurableEventIteratorOutput
              ? DURABLE_EVENT_ITERATOR_PLUGIN_HEADER_VALUE
              : undefined,
          },
        },
      }
    })

    options.clientInterceptors.unshift(async (options) => {
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as DurableEventIteratorHandlerPluginContext | undefined

      if (!pluginContext) {
        throw new TypeError('[DurableEventIteratorHandlerPlugin] Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const output = await options.next()

      const jwt = getJwtIfClientDurableEventIterator(output)

      if (typeof jwt === 'string') {
        pluginContext.isClientDurableEventIteratorOutput = true
        return jwt
      }

      return output
    })
  }
}
