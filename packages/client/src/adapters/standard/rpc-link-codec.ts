import type { ClientContext, ClientOptions, HTTPMethod } from '../../types'
import type { StandardLinkInterceptorOptions } from './link'
import type { StandardRPCSerializer } from './rpc-serializer'
import type { StandardLinkCodec } from './types'
import { isAsyncIteratorObject, stringifyJSON, value, type Value } from '@orpc/shared'
import { mergeStandardHeaders, type StandardHeaders, type StandardLazyResponse, type StandardRequest } from '@orpc/standard-server'
import { isORPCErrorStatus, ORPCError } from '../../error'
import { getMalformedResponseErrorCode, toHttpPath } from './utils'

export interface StandardRPCLinkCodecOptions<T extends ClientContext> {
  /**
   * Base url for all requests.
   */
  url: Value<string | URL, [StandardLinkInterceptorOptions<T>]>

  /**
   * The maximum length of the URL.
   *
   * @default 2083
   */
  maxUrlLength?: Value<number, [StandardLinkInterceptorOptions<T>]>

  /**
   * The method used to make the request.
   *
   * @default 'POST'
   */
  method?: Value<HTTPMethod, [StandardLinkInterceptorOptions<T>]>

  /**
   * The method to use when the payload cannot safely pass to the server with method return from method function.
   * GET is not allowed, it's very dangerous.
   *
   * @default 'POST'
   */
  fallbackMethod?: Exclude<HTTPMethod, 'GET'>

  /**
   * Inject headers to the request.
   */
  headers?: Value<StandardHeaders, [StandardLinkInterceptorOptions<T>]>
}

export class StandardRPCLinkCodec<T extends ClientContext> implements StandardLinkCodec<T> {
  private readonly baseUrl: Exclude<StandardRPCLinkCodecOptions<T>['url'], undefined>
  private readonly maxUrlLength: Exclude<StandardRPCLinkCodecOptions<T>['maxUrlLength'], undefined>
  private readonly fallbackMethod: Exclude<StandardRPCLinkCodecOptions<T>['fallbackMethod'], undefined>
  private readonly expectedMethod: Exclude<StandardRPCLinkCodecOptions<T>['method'], undefined>
  private readonly headers: Exclude<StandardRPCLinkCodecOptions<T>['headers'], undefined>

  constructor(
    private readonly serializer: StandardRPCSerializer,
    options: StandardRPCLinkCodecOptions<T>,
  ) {
    this.baseUrl = options.url
    this.maxUrlLength = options.maxUrlLength ?? 2083
    this.fallbackMethod = options.fallbackMethod ?? 'POST'
    this.expectedMethod = options.method ?? this.fallbackMethod
    this.headers = options.headers ?? {}
  }

  async encode(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<StandardRequest> {
    const generalOptions = { ...options, path, input }

    const expectedMethod = await value(this.expectedMethod, generalOptions)
    let headers = await value(this.headers, generalOptions)
    const baseUrl = await value(this.baseUrl, generalOptions)
    const url = new URL(baseUrl)
    url.pathname = `${url.pathname.replace(/\/$/, '')}${toHttpPath(path)}`

    if (options.lastEventId !== undefined) {
      headers = mergeStandardHeaders(headers, { 'last-event-id': options.lastEventId })
    }

    const serialized = this.serializer.serialize(input)

    if (
      expectedMethod === 'GET'
      && !(serialized instanceof FormData)
      && !isAsyncIteratorObject(serialized)
    ) {
      const maxUrlLength = await value(this.maxUrlLength, generalOptions)
      const getUrl = new URL(url)

      getUrl.searchParams.append('data', stringifyJSON(serialized))

      if (getUrl.toString().length <= maxUrlLength) {
        return {
          body: undefined,
          method: expectedMethod,
          headers,
          url: getUrl,
          signal: options.signal,
        }
      }
    }

    return {
      url,
      method: expectedMethod === 'GET' ? this.fallbackMethod : expectedMethod,
      headers,
      body: serialized,
      signal: options.signal,
    }
  }

  async decode(response: StandardLazyResponse): Promise<unknown> {
    const isOk = !isORPCErrorStatus(response.status)

    const deserialized = await (async () => {
      let isBodyOk = false

      try {
        const body = await response.body()

        isBodyOk = true

        return this.serializer.deserialize(body)
      }
      catch (error) {
        if (!isBodyOk) {
          throw new Error('Cannot parse response body, please check the response body and content-type.', {
            cause: error,
          })
        }

        throw new Error('Invalid RPC response format.', {
          cause: error,
        })
      }
    })()

    if (!isOk) {
      if (ORPCError.isValidJSON(deserialized)) {
        throw ORPCError.fromJSON(deserialized)
      }

      throw new ORPCError(getMalformedResponseErrorCode(response.status), {
        status: response.status,
        data: deserialized,
      })
    }

    return deserialized
  }
}
