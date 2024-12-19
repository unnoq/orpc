/// <reference lib="dom" />

import type { HTTPPath } from '@orpc/contract'
import type { Hooks, Value } from '@orpc/shared'
import type { Router } from '../router'
import type { CallerOptions, Context } from '../types'

export type FetchHandlerOptions<T extends Context> =
  {
  /**
   * The `router` used for handling the request and routing,
   *
   */
    router: Router<T, any>

    /**
     * The request need to be handled.
     */
    request: Request

    /**
     * Remove the prefix from the request path.
     *
     * @example /orpc
     * @example /api
     */
    prefix?: HTTPPath
  }
  & NoInfer<(undefined extends T ? { context?: Value<T> } : { context: Value<T> })>
  & CallerOptions
  & Hooks<Request, Response, T, CallerOptions>

export type FetchHandler = <T extends Context>(
  options: FetchHandlerOptions<T>
) => Promise<Response | undefined>
