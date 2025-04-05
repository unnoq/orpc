import type { StandardHeaders, StandardResponse } from '../types'
import { isAsyncIteratorObject, isObject } from '@orpc/shared'

export interface BatchResponseBodyItem extends StandardResponse {
  index: number
}

export interface ToBatchResponseOptions {
  status: number
  headers: StandardHeaders
  responsePromises: Promise<StandardResponse>[]
}

export function toBatchResponse(options: ToBatchResponseOptions): StandardResponse {
  const genBody: () => AsyncGenerator<BatchResponseBodyItem> = async function* () {
    const entries: (Promise<BatchResponseBodyItem> | undefined)[] = options.responsePromises.map(
      (promise, index) => promise
        .then(response => ({ ...response, index }))
        .catch(() => ({
          index,
          status: 500,
          headers: {},
          body: {
            defined: false,
            code: 'INTERNAL_SERVER_ERROR',
            status: 500,
            message: 'Something went wrong while processing the batch response',
            data: { index },
          },
        })),
    )

    while (true) {
      const promises = entries.filter(entry => !!entry)

      if (!promises.length) {
        return
      }

      const fastest = await Promise.race(promises)

      entries[fastest.index] = undefined

      yield fastest
    }
  }

  return {
    status: options.status,
    headers: options.headers,
    body: genBody(),
  }
}

export function parseBatchResponse(response: StandardResponse): AsyncGenerator<BatchResponseBodyItem> {
  const body = response.body

  if (!isAsyncIteratorObject(body)) {
    throw new TypeError('Invalid batch response')
  }

  return (async function* () {
    try {
      for await (const item of body) {
        if (!isObject(item) || !('index' in item) || !('status' in item) || !('headers' in item)) {
          throw new TypeError('Invalid batch response')
        }

        yield item as unknown as BatchResponseBodyItem
      }
    }
    finally {
      await body.return?.()
    }
  })()
}
