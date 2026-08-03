import type { Context } from '../../context'
import type { StandardHandlerPlugin } from '../standard'
import type { FastifyHandlerOptions } from './handler'
import { sortPlugins } from '@orpc/shared'

export interface FastifyHandlerPlugin<T extends Context> extends StandardHandlerPlugin<T> {
  /**
   * Initializes the plugin and returns new Fastify handler options.
   * Called once per plugin instance during composition.
   *
   * This method allows plugins to wrap, extend, or transform Fastify handler options
   * such as interceptors, or other configuration.
   *
   * @param options - The current handler options from previous plugins or base configuration
   * @returns Transformed handler options with plugin's modifications applied
   *
   * @example
   * ```ts
   * initFastifyHandlerOptions(options) {
   *   return {
   *     ...options,
   *     fastifyInterceptors: [...(options.fastifyInterceptors || []), myInterceptor]
   *   }
   * }
   * ```
   */
  initFastifyHandlerOptions?(options: FastifyHandlerOptions<T>): FastifyHandlerOptions<T>
}

export class CompositeFastifyHandlerPlugin<T extends Context> implements FastifyHandlerPlugin<T> {
  readonly name = '~composite/fastify'

  protected readonly plugins: FastifyHandlerPlugin<T>[]

  constructor(plugins: FastifyHandlerPlugin<T>[] = []) {
    this.plugins = sortPlugins(plugins)
  }

  initFastifyHandlerOptions(options: FastifyHandlerOptions<T>): FastifyHandlerOptions<T> {
    for (const plugin of this.plugins) {
      if (plugin.initFastifyHandlerOptions) {
        options = plugin.initFastifyHandlerOptions(options)
      }
    }

    return options
  }
}
