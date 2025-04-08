import type { Value } from '@orpc/shared'
import type { StandardHeaders, StandardRequest } from '@orpc/standard-server'
import type { BatchResponseBodyItem } from '@orpc/standard-server/batch'
import type { StandardHandlerInterceptorOptions, StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import { value } from '@orpc/shared'
import { parseBatchRequest, toBatchResponse } from '@orpc/standard-server/batch'

export interface BatchHandlerOptions<T extends Context> {
  /**
   * The max size of the batch allowed.
   *
   * @default 10
   */
  maxSize?: Value<number, [StandardHandlerInterceptorOptions<T>]>

  /**
   * Map the request before processing it.
   *
   * @default merged back batch request headers into the request
   */
  mapRequestItem?(request: StandardRequest, batchOptions: StandardHandlerInterceptorOptions<T>): StandardRequest

  /**
   * Success batch response status code.
   *
   * @default 207
   */
  successStatus?: Value<number, [responses: Promise<BatchResponseBodyItem>[], batchOptions: StandardHandlerInterceptorOptions<T>]>

  /**
   * success batch response headers.
   *
   * @default {}
   */
  headers?: Value<StandardHeaders, [responses: Promise<BatchResponseBodyItem>[], batchOptions: StandardHandlerInterceptorOptions<T>]>
}

export class BatchHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  private readonly maxSize: Exclude<BatchHandlerOptions<T>['maxSize'], undefined>
  private readonly mapRequestItem: Exclude<BatchHandlerOptions<T>['mapRequestItem'], undefined>
  private readonly successStatus: Exclude<BatchHandlerOptions<T>['successStatus'], undefined>
  private readonly headers: Exclude<BatchHandlerOptions<T>['headers'], undefined>

  order = 5_000_000

  constructor(options: BatchHandlerOptions<T> = {}) {
    this.maxSize = options.maxSize ?? 10

    this.mapRequestItem = options.mapRequestItem ?? ((request, { request: batchRequest }) => ({
      ...request,
      headers: {
        ...batchRequest.headers,
        ...request.headers,
      },
    }))

    this.successStatus = options.successStatus ?? 207
    this.headers = options.headers ?? {}
  }

  init(options: StandardHandlerOptions<T>): void {
    options.rootInterceptors ??= []

    options.rootInterceptors.unshift(async (options) => {
      if (options.request.headers['x-orpc-batch'] !== '1') {
        return options.next()
      }

      let isParsing = false

      try {
        isParsing = true
        const parsed = parseBatchRequest({ ...options.request, body: await options.request.body() })
        isParsing = false

        const maxSize = await value(this.maxSize, options)

        if (parsed.length > maxSize) {
          return {
            matched: true,
            response: {
              status: 413,
              headers: {},
              body: 'Batch request size exceeds the maximum allowed size',
            },
          }
        }

        const responses: Promise<BatchResponseBodyItem>[] = parsed
          .map((request, index) => {
            const mapped = this.mapRequestItem(request, options)

            return options
              .next({ ...options, request: { ...mapped, body: () => Promise.resolve(mapped.body) } })
              .then(({ response, matched }) => {
                if (matched) {
                  return { ...response, index }
                }

                return { index, status: 404, headers: {}, body: 'No procedure matched' }
              })
              .catch(() => {
                return { index, status: 500, headers: {}, body: 'Internal server error' }
              })
          },
          )

        // wait until at least one request is resolved
        await Promise.race(responses)

        const status = await value(this.successStatus, responses, options)
        const headers = await value(this.headers, responses, options)

        const response = toBatchResponse({
          status,
          headers,
          body: (async function* () {
            const promises: (Promise<BatchResponseBodyItem> | undefined)[] = [...responses]

            while (true) {
              const handling = promises.filter(p => p !== undefined)

              if (handling.length === 0) {
                return
              }

              const result = await Promise.race(handling)
              promises[result.index] = undefined
              yield result
            }
          })(),
        })

        return {
          matched: true,
          response,
        }
      }
      catch (cause) {
        if (isParsing) {
          return {
            matched: true,
            response: { status: 400, headers: {}, body: 'Invalid batch request, this could be caused by a malformed request body or a missing header' },
          }
        }

        throw cause
      }
    })
  }
}
