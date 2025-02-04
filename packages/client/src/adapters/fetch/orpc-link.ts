import type { ClientOptions, HTTPMethod } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { ClientLink } from '../../types'
import type { FetchWithContext } from './types'
import { ORPCError } from '@orpc/contract'
import { RPCSerializer } from '@orpc/server/standard'
import { isPlainObject, trim } from '@orpc/shared'
import { parseRPCResponse } from './utils'

export interface RPCLinkOptions<TClientContext> {
  /**
   * Base url for all requests.
   */
  url: string

  /**
   * The maximum length of the URL.
   *
   * @default 2083
   */
  maxURLLength?: number

  /**
   * The method used to make the request.
   *
   * @default 'POST'
   */
  method?(path: readonly string[], input: unknown, context: TClientContext): Promisable<HTTPMethod | undefined>

  /**
   * The method to use when the payload cannot safely pass to the server with method return from method function.
   * GET is not allowed, it's very dangerous.
   *
   * @default 'POST'
   */
  fallbackMethod?: Exclude<HTTPMethod, 'GET'>

  headers?(path: readonly string[], input: unknown, context: TClientContext): Promisable<Headers | Record<string, string>>

  fetch?: FetchWithContext<TClientContext>

  rpcSerializer?: RPCSerializer
}

export class RPCLink<TClientContext> implements ClientLink<TClientContext> {
  private readonly fetch: FetchWithContext<TClientContext>
  private readonly rpcSerializer: RPCSerializer
  private readonly maxURLLength: number
  private readonly fallbackMethod: Exclude<HTTPMethod, 'GET'>
  private readonly getMethod: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<HTTPMethod>
  private readonly getHeaders: (path: readonly string[], input: unknown, context: TClientContext) => Promisable<Headers>
  private readonly url: string

  constructor(options: RPCLinkOptions<TClientContext>) {
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.rpcSerializer = options.rpcSerializer ?? new RPCSerializer()
    this.maxURLLength = options.maxURLLength ?? 2083
    this.fallbackMethod = options.fallbackMethod ?? 'POST'
    this.url = options.url

    this.getMethod = async (path, input, context) => {
      return await options.method?.(path, input, context) ?? this.fallbackMethod
    }

    this.getHeaders = async (path, input, context) => {
      return new Headers(await options.headers?.(path, input, context))
    }
  }

  async call(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<unknown> {
    // clientContext only undefined when context is undefinable so we can safely cast it
    const clientContext = options.context as typeof options.context & { context: TClientContext }
    const encoded = await this.encode(path, input, options)

    const response = await this.fetch(encoded.url, {
      method: encoded.method,
      headers: encoded.headers,
      body: encoded.body,
      signal: options.signal,
    }, clientContext)

    const decoded = await this.rpcSerializer.deserialize(await parseRPCResponse(response) as any)

    if (!response.ok) {
      throw ORPCError.fromJSON(decoded as any)
    }

    return decoded
  }

  private async encode(path: readonly string[], input: unknown, options: ClientOptions<TClientContext>): Promise<{
    url: URL
    method: HTTPMethod
    headers: Headers
    body: FormData | Blob | string | undefined
  }> {
    // clientContext only undefined when context is undefinable so we can safely cast it
    const clientContext = options.context as typeof options.context & { context: TClientContext }
    const expectMethod = await this.getMethod(path, input, clientContext)

    const headers = await this.getHeaders(path, input, clientContext)
    const url = new URL(`${trim(this.url, '/')}/${path.map(encodeURIComponent).join('/')}`)

    headers.append('x-orpc-handler', '1')

    const serialized = this.rpcSerializer.serialize(input)

    if (expectMethod === 'GET' && isPlainObject(serialized)) {
      const tryURL = new URL(url)

      tryURL.searchParams.append('data', JSON.stringify(serialized))

      if (tryURL.toString().length <= this.maxURLLength) {
        return {
          body: undefined,
          method: expectMethod,
          headers,
          url: tryURL,
        }
      }
    }

    const method = expectMethod === 'GET' ? this.fallbackMethod : expectMethod

    if (isPlainObject(serialized)) {
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json')
      }

      return {
        body: JSON.stringify(serialized),
        method,
        headers,
        url,
      }
    }

    return {
      body: serialized,
      method,
      headers,
      url,
    }
  }
}
