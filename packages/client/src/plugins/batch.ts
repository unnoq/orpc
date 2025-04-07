import type { InterceptorOptions, ThrowableError, Value } from '@orpc/shared'
import type { StandardHeaders, StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { StandardLinkClientInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '../adapters/standard'
import type { ClientContext } from '../types'
import { isAsyncIteratorObject, splitInHalf, toArray, value } from '@orpc/shared'
import { parseBatchResponse, toBatchRequest } from '@orpc/standard-server/batch'

export interface BatchLinkPluginGroup<T extends ClientContext> {
  condition(options: StandardLinkClientInterceptorOptions<T>): boolean
  context: T
  path?: readonly string[]
  input?: unknown
}

export interface BatchLinkPluginOptions<T extends ClientContext> {
  groups: readonly [BatchLinkPluginGroup<T>, ...BatchLinkPluginGroup<T>[]]

  /**
   * The maximum number of requests in the batch.
   *
   * @default 10
   */
  maxBatchSize?: Value<number, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * Defines the URL to use for the batch request.
   *
   * @default the URL of the first request in the batch + '/__batch__'
   */
  url?: Value<string | URL, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * The maximum length of the URL.
   *
   * @default 2083
   */
  maxUrlLength?: Value<number, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * Defines the HTTP headers to use for the batch request.
   *
   * @default The same headers of all requests in the batch
   */
  headers?: Value<StandardHeaders, [readonly [StandardLinkClientInterceptorOptions<T>, ...StandardLinkClientInterceptorOptions<T>[]]]>

  /**
   * Map the batch request items before sending them.
   *
   * @default Removes headers that are duplicated in the batch headers.
   */
  mapRequestItem?: (options: StandardLinkClientInterceptorOptions<T> & { batchUrl: URL, batchHeaders: StandardHeaders }) => StandardRequest
}

export class BatchLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  private readonly groups: Exclude<BatchLinkPluginOptions<T>['groups'], undefined>
  private readonly maxBatchSize: Exclude<BatchLinkPluginOptions<T>['maxBatchSize'], undefined>
  private readonly batchUrl: Exclude<BatchLinkPluginOptions<T>['url'], undefined>
  private readonly maxUrlLength: Exclude<BatchLinkPluginOptions<T>['maxUrlLength'], undefined>
  private readonly batchHeaders: Exclude<BatchLinkPluginOptions<T>['headers'], undefined>
  private readonly mapRequestItem: Exclude<BatchLinkPluginOptions<T>['mapRequestItem'], undefined>

  private pending: Map<
    BatchLinkPluginGroup<T>,
    [
      options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>,
      resolve: (response: StandardLazyResponse) => void,
      reject: (e: unknown) => void,
    ][]
  >

  constructor(options: BatchLinkPluginOptions<T>) {
    this.groups = options.groups
    this.pending = new Map()

    this.maxBatchSize = options.maxBatchSize ?? 10
    this.maxUrlLength = options.maxUrlLength ?? 2083

    this.batchUrl = options.url ?? (([options]) => `${options.request.url.origin}${options.request.url.pathname}/__batch__`)

    this.batchHeaders = options.headers ?? (([options, ...rest]) => {
      const headers: StandardHeaders = {}

      for (const [key, value] of Object.entries(options.request.headers)) {
        if (rest.every(item => item.request.headers[key] === value)) {
          headers[key] = value
        }
      }

      return headers
    })

    this.mapRequestItem = options.mapRequestItem ?? (({ request, batchHeaders }) => {
      const headers: StandardHeaders = {}

      for (const [key, value] of Object.entries(request.headers)) {
        if (batchHeaders[key] !== value) {
          headers[key] = value
        }
      }

      return {
        method: request.method,
        url: request.url,
        headers,
        body: request.body,
        signal: request.signal,
      }
    })
  }

  init(options: StandardLinkOptions<T>): void {
    options.clientInterceptors ??= []

    options.clientInterceptors.push((options) => {
      if (options.request.headers['x-orpc-batch'] !== '1') {
        return options.next()
      }

      return options.next({
        ...options,
        request: {
          ...options.request,
          headers: {
            ...options.request.headers,
            'x-orpc-batch': undefined,
          },
        },
      })
    })

    options.clientInterceptors.push((options) => {
      if (
        options.request.body instanceof Blob
        || options.request.body instanceof FormData
        || isAsyncIteratorObject(options.request.body)
      ) {
        return options.next()
      }

      const group = this.groups.find(group => group.condition(options))

      if (!group) {
        return options.next()
      }

      return new Promise((resolve, reject) => {
        this.#enqueueRequest(group, options, resolve, reject)
        setTimeout(() => this.#processPendingBatches())
      })
    })
  }

  #enqueueRequest(
    group: BatchLinkPluginGroup<T>,
    options: InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>,
    resolve: (response: StandardLazyResponse) => void,
    reject: (e: unknown) => void,
  ): void {
    const items = this.pending.get(group)

    if (items) {
      items.push([options, resolve, reject])
    }
    else {
      this.pending.set(group, [[options, resolve, reject]])
    }
  }

  async #processPendingBatches(): Promise<void> {
    const pending = this.pending
    this.pending = new Map()

    for (const [group, items] of pending) {
      const getItems = items.filter(([options]) => options.request.method === 'GET')
      const restItems = items.filter(([options]) => options.request.method !== 'GET')

      this.#executeBatch('GET', group, getItems)
      this.#executeBatch('POST', group, restItems)
    }
  }

  async #executeBatch(
    method: 'GET' | 'POST',
    group: BatchLinkPluginGroup<T>,
    groupItems: typeof this.pending extends Map<any, infer U> ? U : never,
  ): Promise<void> {
    if (!groupItems.length) {
      return
    }

    const batchItems = groupItems as [typeof groupItems[number], ...typeof groupItems[number][]]

    if (batchItems.length === 1) {
      batchItems[0][0].next().then(batchItems[0][1]).catch(batchItems[0][2])
      return
    }

    try {
      const options = batchItems.map(([options]) => options) as [InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>, ...InterceptorOptions<StandardLinkClientInterceptorOptions<T>, StandardLazyResponse, ThrowableError>[]]

      const maxBatchSize = await value(this.maxBatchSize, options)

      if (batchItems.length > maxBatchSize) {
        const [first, second] = splitInHalf(batchItems)
        this.#executeBatch(method, group, first)
        this.#executeBatch(method, group, second)
        return
      }

      const batchUrl = new URL(await value(this.batchUrl, options))
      const batchHeaders = await value(this.batchHeaders, options)
      const mappedItems = batchItems.map(([options]) => this.mapRequestItem({ ...options, batchUrl, batchHeaders }))

      const batchRequest = toBatchRequest({
        method,
        url: batchUrl,
        headers: batchHeaders,
        requests: mappedItems,
      })

      const maxUrlLength = await value(this.maxUrlLength, options)

      if (batchRequest.url.toString().length > maxUrlLength) {
        const [first, second] = splitInHalf(batchItems)
        this.#executeBatch(method, group, first)
        this.#executeBatch(method, group, second)
        return
      }

      const lazyResponse = await options[0].next({
        request: { ...batchRequest, headers: { ...batchRequest.headers, 'x-orpc-batch': '1' } },
        signal: batchRequest.signal,
        context: group.context,
        input: group.input,
        path: toArray(group.path),
      })

      const parsed = parseBatchResponse({ ...lazyResponse, body: await lazyResponse.body() })

      for await (const item of parsed) {
        batchItems[item.index]?.[1]({ ...item, body: () => Promise.resolve(item.body) })
      }

      /**
       * JS ignore the second resolve or reject so we don't need to check if has been resolved
       */
      throw new Error('Something went wrong make batch response not contains this response. This is a bug please report it.')
    }
    catch (error) {
      /**
       * JS ignore the second resolve or reject so we don't need to check if has been resolved
       */
      for (const [, , reject] of batchItems) {
        reject(error)
      }
    }
  }
}
