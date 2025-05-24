import type { StandardLazyRequest } from '@orpc/standard-server'
import type { APIGatewayEvent } from 'aws-lambda'
import { once } from '@orpc/shared'
import { toStandardBody } from './body'
import { toStandardHeaders } from './headers'
import { toStandardUrl } from './url'

export function toStandardLazyRequest(event: APIGatewayEvent): StandardLazyRequest {
  return {
    url: toStandardUrl(event),
    method: event.httpMethod,
    get headers() {
      const headers = toStandardHeaders(event.headers, event.multiValueHeaders)
      Object.defineProperty(this, 'headers', { value: headers, writable: true })
      return headers
    },
    set headers(value) {
      Object.defineProperty(this, 'headers', { value, writable: true })
    },
    signal: undefined,
    body: once(() => toStandardBody(event)),
  }
}
