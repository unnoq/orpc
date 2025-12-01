import type { Context, Router } from '@orpc/server'
import type { StandardHandlerOptions, StandardHandlerPlugin } from '@orpc/server/standard'
import { getClientDurableIteratorToken } from './client'
import { DURABLE_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_ITERATOR_PLUGIN_HEADER_VALUE } from './consts'
import { DurableIteratorError } from './error'

export interface DurableIteratorHandlerPluginContext {
  isClientDurableIteratorOutput?: boolean
}

/**
 * @see {@link https://orpc.dev/docs/integrations/durable-iterator Durable Iterator Integration}
 */
export class DurableIteratorHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_ITERATOR_HANDLER_PLUGIN_CONTEXT')

  /**
   * make sure run after batch plugin
   */
  order = 1_500_000

  init(options: StandardHandlerOptions<T>, _router: Router<any, T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.unshift(async (options) => {
      const pluginContext: DurableIteratorHandlerPluginContext = {}

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
            [DURABLE_ITERATOR_PLUGIN_HEADER_KEY]: pluginContext.isClientDurableIteratorOutput
              ? DURABLE_ITERATOR_PLUGIN_HEADER_VALUE
              : undefined,
          },
        },
      }
    })

    options.clientInterceptors.unshift(async (options) => {
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as DurableIteratorHandlerPluginContext | undefined

      if (!pluginContext) {
        throw new DurableIteratorError('Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const output = await options.next()

      const token = getClientDurableIteratorToken(output)

      if (typeof token === 'string') {
        pluginContext.isClientDurableIteratorOutput = true
        return token
      }

      return output
    })
  }
}
