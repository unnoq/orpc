import type { Interceptor, ThrowableError } from '@orpc/shared'
import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientLink, ClientOptions } from '../../types'
import type { StandardLinkClient, StandardLinkCodec } from './types'
import { intercept, toArray } from '@orpc/shared'

export class InvalidEventIteratorRetryResponse extends Error { }

export interface StandardLinkPlugin<T extends ClientContext> {
  init?(options: StandardLinkOptions<T>): void
}

export interface StandardLinkOptions<T extends ClientContext> {
  interceptors?: Interceptor<{ path: readonly string[], input: unknown, options: ClientOptions<T> }, unknown, ThrowableError>[]
  clientInterceptors?: Interceptor<{ request: StandardRequest, path: readonly string[], input: unknown, options: ClientOptions<T> }, StandardLazyResponse, ThrowableError>[]
  plugins?: StandardLinkPlugin<T>[]
}

export class StandardLink<T extends ClientContext> implements ClientLink<T> {
  private readonly interceptors: Exclude<StandardLinkOptions<T>['interceptors'], undefined>
  private readonly clientInterceptors: Exclude<StandardLinkOptions<T>['clientInterceptors'], undefined>

  constructor(
    public readonly codec: StandardLinkCodec<T>,
    public readonly sender: StandardLinkClient<T>,
    options: StandardLinkOptions<T> = {},
  ) {
    for (const plugin of toArray(options.plugins)) {
      plugin.init?.(options)
    }

    this.interceptors = toArray(options.interceptors)
    this.clientInterceptors = toArray(options.clientInterceptors)
  }

  call(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<unknown> {
    return intercept(this.interceptors, { path, input, options }, async ({ path, input, options }) => {
      const output = await this.#call(path, input, options)

      return output
    })
  }

  async #call(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<unknown> {
    const request = await this.codec.encode(path, input, options)

    const response = await intercept(
      this.clientInterceptors,
      { request, options, path, input },
      ({ request, options, path, input }) => this.sender.call(request, options, path, input),
    )

    const output = await this.codec.decode(response, options, path, input)

    return output
  }
}
