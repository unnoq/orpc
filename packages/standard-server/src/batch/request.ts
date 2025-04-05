import type { StandardHeaders, StandardRequest } from '../types'
import { parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import { toBatchAbortSignal } from './signal'

export interface ToBatchRequestOptions {
  url: URL
  method: 'GET' | 'POST'
  headers: StandardHeaders
  requests: readonly StandardRequest[]
}

export function toBatchRequest(options: ToBatchRequestOptions): StandardRequest {
  const url = new URL(options.url)
  let body: unknown

  const batchRequestItems = options.requests.map(request => ({
    body: request.body,
    headers: request.headers,
    method: request.method,
    url: request.url,
  } satisfies Omit<StandardRequest, 'signal'>))

  if (options.method === 'GET') {
    url.searchParams.append('batch', stringifyJSON(batchRequestItems))
  }

  else if (options.method === 'POST') {
    body = batchRequestItems
  }

  return {
    method: options.method,
    url,
    headers: options.headers,
    body,
    signal: toBatchAbortSignal(options.requests.map(request => request.signal)),
  }
}

export function parseBatchRequest(request: StandardRequest): StandardRequest[] {
  const items = request.method === 'GET'
    ? parseEmptyableJSON(request.url.searchParams.getAll('batch').at(-1))
    : request.body

  if (!Array.isArray(items)) {
    throw new TypeError('Invalid batch request')
  }

  return items.map((item) => {
    return {
      method: item.method,
      url: new URL(item.url),
      headers: item.headers,
      body: item.body,
      signal: request.signal,
    } satisfies StandardRequest
  })
}
