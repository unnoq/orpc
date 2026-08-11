import type { Value } from '@orpc/shared'
import type { StandardHandlerOptions, StandardHandlerPlugin, StandardHandlerRoutingInterceptor, StandardHandlerRoutingInterceptorOptions } from '../adapters/standard'
import type { Context } from '../context'
import { toArray, value } from '@orpc/shared'
import { flattenStandardHeader } from '@standardserver/core'

export interface SimpleCsrfProtectionHandlerPluginOptions<T extends Context> {
  /**
   * Cross-site origins trusted to invoke procedures, as a string, an array of origins,
   * or a function returning them. Use `'*'` to trust every origin, which turns off the
   * cross-site check entirely.
   *
   * Consulted for every request your own origin did not initiate, so same-origin clients never
   * need it. Set it to the same allowlist you pass to the CORS Handler Plugin.
   *
   * @default undefined (no other origin is trusted)
   */
  origin?: Value<string | readonly string[] | null | undefined, [origin: string, options: StandardHandlerRoutingInterceptorOptions<T>]>

  /**
   * Whether every other origin on the same site, such as a sibling subdomain
   * (`docs.example.com` calling `api.example.com`), is trusted. Off by default, because a
   * subdomain you do not control, or one that serves user content, can forge requests that
   * carry your cookies. Prefer listing the subdomains you trust in `origin`.
   *
   * @default false
   */
  allowSameSite?: boolean

  /**
   * [Sec-Fetch-Mode](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Mode)
   * values allowed to invoke a procedure. Every mode is allowed by default, so a trusted site
   * may reach your API through a navigation, an HTML form submission, or a subresource load
   * such as `<img>`, as well as through `fetch`.
   *
   * Narrow it to `['cors', 'same-origin']` to accept scripted requests only. That also rejects
   * requests triggered by a URL smuggled into a trusted page, for example a user-supplied avatar
   * URL, at the cost of breaking HTML form submissions.
   *
   * Requests that carry no `Sec-Fetch-Mode` header are never rejected by this option.
   *
   * @default undefined (every mode is allowed)
   */
  allowModes?: readonly ('cors' | 'navigate' | 'no-cors' | 'same-origin' | 'websocket' | (string & {}))[]
}

/**
 * Adds basic Cross-Site Request Forgery (CSRF) protection to your oRPC application by
 * rejecting requests that a browser reports as initiated by another site, or by no page at
 * all, such as a link opened from an email.
 *
 * @remarks
 * Unlike `SameSite` cookies, this protection also covers cross-site requests that
 * still carry cookies, so it is the recommended safeguard when you enable the `GET`
 * method on RPC handlers or rely on cookie-based authentication.
 *
 * @see {@link https://orpc.dev/docs/plugins/simple-csrf-protection | Simple CSRF Protection Plugin}
 */
export class SimpleCsrfProtectionHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  name = '~simple-csrf-protection'

  /**
   * Judge the request the browser actually sent, before batch interceptors split it into
   * sub-requests whose headers the client chooses.
   */
  after = ['~batch']

  private readonly origin: SimpleCsrfProtectionHandlerPluginOptions<T>['origin']
  private readonly allowSameSite: boolean
  private readonly allowModes: ReadonlySet<string> | undefined

  constructor(options: SimpleCsrfProtectionHandlerPluginOptions<T> = {}) {
    this.origin = options.origin
    this.allowSameSite = options.allowSameSite ?? false
    this.allowModes = options.allowModes === undefined
      ? undefined
      : new Set(options.allowModes.map(mode => mode.toLowerCase()))
  }

  init(options: StandardHandlerOptions<T>): StandardHandlerOptions<T> {
    const routingInterceptor: StandardHandlerRoutingInterceptor<T> = (interceptorOptions) => {
      if (this.isAllowed(interceptorOptions)) {
        return interceptorOptions.next()
      }

      return Promise.resolve({
        matched: true,
        response: { status: 403, headers: {}, body: 'Request blocked by CSRF protection.' },
      })
    }

    return {
      ...options,
      routingInterceptors: [routingInterceptor, ...toArray(options.routingInterceptors)],
    }
  }

  private isAllowed(interceptorOptions: StandardHandlerRoutingInterceptorOptions<T>): boolean {
    const headers = interceptorOptions.request.headers

    if (this.allowModes !== undefined) {
      const mode = flattenStandardHeader(headers['sec-fetch-mode'])?.toLowerCase()

      // Only a mode the browser actually reported can be rejected: a missing header carries
      // no signal, and the site check below still applies to those requests.
      if (mode !== undefined && !this.allowModes.has(mode)) {
        return false
      }
    }

    const site = flattenStandardHeader(headers['sec-fetch-site'])?.toLowerCase()

    // No `Sec-Fetch-Site` means the client is not a browser (curl, mobile apps,
    // server-to-server) or is one too old to send Fetch Metadata, so there is nothing to judge.
    if (site === undefined || site === 'same-origin' || (site === 'same-site' && this.allowSameSite)) {
      return true
    }

    // Whatever is left was initiated by an origin other than your own: a sibling subdomain, an
    // unrelated site, or no page at all (`none`, such as a link opened from an email). A
    // cross-site `fetch` still reaches the server even when CORS hides the response from the
    // caller, so the procedure runs unless the origin is explicitly trusted.
    const origin = flattenStandardHeader(headers.origin) ?? ''
    const allowedOrigins = toArray(value(this.origin, origin, interceptorOptions))

    return allowedOrigins.includes('*') || allowedOrigins.includes(origin)
  }
}
