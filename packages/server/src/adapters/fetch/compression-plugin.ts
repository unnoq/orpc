/**
 * This plugin is heavily inspired by the [Hono Compression Plugin](https://github.com/honojs/hono/blob/main/src/middleware/compress/index.ts)
 */

import type { Context } from '../../context'
import type { FetchHandlerOptions } from './handler'
import type { FetchHandlerPlugin } from './plugin'

const ORDERED_SUPPORTED_ENCODINGS = ['gzip', 'deflate'] as const

export interface CompressionPluginOptions {
  /**
   * The compression schemes to use for response compression.
   * Schemes are prioritized by their order in this array and
   * only applied if the client supports them.
   *
   * @default ['gzip', 'deflate']
   */
  encodings?: readonly (typeof ORDERED_SUPPORTED_ENCODINGS)[number][]

  /**
   * The minimum response size in bytes required to trigger compression.
   * Responses smaller than this threshold will not be compressed to avoid overhead.
   * If the response size cannot be determined, compression will still be applied.
   *
   * @default 1024 (1KB)
   */
  threshold?: number

  /**
   * A filter function to determine if a response should be compressed.
   * This function is called in addition to the default compression checks
   * and allows for custom compression logic based on the request and response.
   */
  filter?: (request: Request, response: Response) => boolean
}

/**
 * The Compression Plugin adds response compression to the Fetch Server.
 * Build on top of [CompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)
 * You might need to polyfill it if your environment does not support it.
 *
 * @see {@link https://orpc.unnoq.com/docs/plugins/compression Compression Plugin Docs}
 */
export class CompressionPlugin<T extends Context> implements FetchHandlerPlugin<T> {
  private readonly encodings: Exclude<CompressionPluginOptions['encodings'], undefined>
  private readonly threshold: Exclude<CompressionPluginOptions['threshold'], undefined>
  private readonly filter: CompressionPluginOptions['filter']

  constructor(options: CompressionPluginOptions = {}) {
    this.encodings = options.encodings ?? ORDERED_SUPPORTED_ENCODINGS
    this.threshold = options.threshold ?? 1024
    this.filter = options.filter
  }

  initRuntimeAdapter(options: FetchHandlerOptions<T>): void {
    options.adapterInterceptors ??= []

    /**
     * use `unshift` to ensure this runs before user-defined adapter interceptors
     */
    options.adapterInterceptors.unshift(async (options) => {
      const result = await options.next()

      if (!result.matched) {
        return result
      }

      const response = result.response

      if (
        response.headers.has('content-encoding') // already encoded
        || response.headers.has('transfer-encoding') // already encoded or chunked
        || !isCompressibleContentType(response.headers.get('content-type')) // not compressible
        || isNoTransformCacheControl(response.headers.get('cache-control')) // no-transform directive
      ) {
        return result
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength && Number(contentLength) < this.threshold) {
        return result
      }

      const acceptEncoding = options.request.headers
        .get('accept-encoding')
        ?.split(',')
        .map(enc => enc.trim().split(';')[0]!)

      const encoding = this.encodings.find(enc => acceptEncoding?.includes(enc))

      if (!response.body || encoding === undefined) {
        return result
      }

      if (this.filter && !this.filter(options.request, response)) {
        return result
      }

      const compressedBody = response.body.pipeThrough(new CompressionStream(encoding))
      const compressedHeaders = new Headers(response.headers)
      compressedHeaders.delete('content-length') // CompressionStream will change the content length
      compressedHeaders.set('content-encoding', encoding)

      return {
        ...result,
        response: new Response(compressedBody, {
          ...response,
          headers: compressedHeaders,
        }),
      }
    })
  }
}

/**
 * https://github.com/honojs/hono/blob/main/src/utils/compress.ts#L9
 */
const COMPRESSIBLE_CONTENT_TYPE_REGEX = /^\s*(?:text\/(?!event-stream(?:[;\s]|$))[^;\s]+|application\/(?:javascript|json|xml|xml-dtd|ecmascript|dart|postscript|rtf|tar|toml|vnd\.dart|vnd\.ms-fontobject|vnd\.ms-opentype|wasm|x-httpd-php|x-javascript|x-ns-proxy-autoconfig|x-sh|x-tar|x-virtualbox-hdd|x-virtualbox-ova|x-virtualbox-ovf|x-virtualbox-vbox|x-virtualbox-vdi|x-virtualbox-vhd|x-virtualbox-vmdk|x-www-form-urlencoded)|font\/(?:otf|ttf)|image\/(?:bmp|vnd\.adobe\.photoshop|vnd\.microsoft\.icon|vnd\.ms-dds|x-icon|x-ms-bmp)|message\/rfc822|model\/gltf-binary|x-shader\/x-fragment|x-shader\/x-vertex|[^;\s]+?\+(?:json|text|xml|yaml))(?:[;\s]|$)/i
function isCompressibleContentType(contentType: string | null): boolean {
  if (contentType === null) {
    return false
  }
  return COMPRESSIBLE_CONTENT_TYPE_REGEX.test(contentType)
}

/**
 * https://github.com/honojs/hono/blob/main/src/middleware/compress/index.ts#L10
 */
const CACHE_CONTROL_NO_TRANSFORM_REGEX = /(?:^|,)\s*no-transform\s*(?:,|$)/i
function isNoTransformCacheControl(cacheControl: string | null): boolean {
  if (cacheControl === null) {
    return false
  }
  return CACHE_CONTROL_NO_TRANSFORM_REGEX.test(cacheControl)
}
