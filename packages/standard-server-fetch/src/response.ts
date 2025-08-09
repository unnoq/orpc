import type { StandardLazyResponse, StandardResponse } from '@orpc/standard-server'
import type { ToFetchBodyOptions, ToStandardBodyOptions } from './body'
import { once } from '@orpc/shared'
import { toFetchBody, toStandardBody } from './body'
import { toFetchHeaders, toStandardHeaders } from './headers'

export interface ToFetchResponseOptions extends ToFetchBodyOptions {}

export function toFetchResponse(
  response: StandardResponse,
  options: ToFetchResponseOptions = {},
): Response {
  const headers = toFetchHeaders(response.headers)
  const body = toFetchBody(response.body, headers, options)
  return new Response(body, { headers, status: response.status })
}

export interface ToStandardLazyResponseOptions extends ToStandardBodyOptions {}

export function toStandardLazyResponse(
  response: Response,
  options: ToStandardLazyResponseOptions = {},
): StandardLazyResponse {
  return {
    body: once(() => toStandardBody(response, options)),
    status: response.status,
    get headers() {
      const headers = toStandardHeaders(response.headers)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
  }
}
