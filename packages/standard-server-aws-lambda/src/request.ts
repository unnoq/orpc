import type { StandardLazyRequest } from '@orpc/standard-server'
import type Stream from 'node:stream'
import type { APIGatewayProxyEventV2 } from './types'
import { once } from '@orpc/shared'
import { toAbortSignal } from '@orpc/standard-server-node'
import { toStandardBody } from './body'
import { toStandardHeaders } from './headers'
import { toStandardUrl } from './url'

export function toStandardLazyRequest(event: APIGatewayProxyEventV2, responseStream: Stream.Writable): StandardLazyRequest {
  const signal = toAbortSignal(responseStream)

  return {
    url: toStandardUrl(event),
    method: event.requestContext.http.method,
    headers: toStandardHeaders(event.headers, event.cookies),
    signal,
    body: once(() => toStandardBody(event, { signal })),
  }
}
