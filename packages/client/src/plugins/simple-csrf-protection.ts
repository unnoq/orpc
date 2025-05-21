import type { Promisable, Value } from '@orpc/shared'
import type { StandardLinkClientInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '../adapters/standard'
import type { ClientContext } from '../types'
import { value } from '@orpc/shared'

export interface SimpleCsrfProtectionLinkPluginOptions<T extends ClientContext> {
  /**
   * The name of the header to check.
   *
   * @default 'x-csrf-token'
   */
  headerName?: Value<Promisable<string>, [options: StandardLinkClientInterceptorOptions<T>]>

  /**
   * The value of the header to check.
   *
   * @default 'orpc'
   *
   */
  headerValue?: Value<Promisable<string>, [options: StandardLinkClientInterceptorOptions<T>]>

  /**
   * Exclude a procedure from the plugin.
   *
   * @default false
   */
  exclude?: Value<Promisable<boolean>, [options: StandardLinkClientInterceptorOptions<T>]>
}

/**
 * This plugin adds basic Cross-Site Request Forgery (CSRF) protection to your oRPC application.
 * It helps ensure that requests to your procedures originate from JavaScript code,
 * not from other sources like standard HTML forms or direct browser navigation.
 *
 * @see {@link https://orpc.unnoq.com/docs/plugins/simple-csrf-protection Simple CSRF Protection Plugin Docs}
 */
export class SimpleCsrfProtectionLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  private readonly headerName: Exclude<SimpleCsrfProtectionLinkPluginOptions<T>['headerName'], undefined>
  private readonly headerValue: Exclude<SimpleCsrfProtectionLinkPluginOptions<T>['headerValue'], undefined>
  private readonly exclude: Exclude<SimpleCsrfProtectionLinkPluginOptions<T>['exclude'], undefined>

  constructor(options: SimpleCsrfProtectionLinkPluginOptions<T> = {}) {
    this.headerName = options.headerName ?? 'x-csrf-token'
    this.headerValue = options.headerValue ?? 'orpc'
    this.exclude = options.exclude ?? false
  }

  order = 8_000_000

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.push(async (options) => {
      const excluded = await value(this.exclude, options)

      if (excluded) {
        return options.next()
      }

      const headerName = await value(this.headerName, options)
      const headerValue = await value(this.headerValue, options)

      return options.next({
        ...options,
        request: {
          ...options.request,
          headers: {
            ...options.request.headers,
            [headerName]: headerValue,
          },
        },
      })
    })
  }
}
