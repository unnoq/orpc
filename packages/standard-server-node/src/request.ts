import type { StandardLazyRequest } from '@orpc/standard-server'
import type { NodeHttpRequest, NodeHttpResponse } from './types'
import { once } from '@orpc/shared'
import { toStandardBody } from './body'
import { toStandardMethod } from './method'
import { toAbortSignal } from './signal'
import { toStandardUrl } from './url'

export function toStandardLazyRequest(
  req: NodeHttpRequest,
  res: NodeHttpResponse,
): StandardLazyRequest {
  const signal = toAbortSignal(res)

  return {
    method: toStandardMethod(req.method),
    url: toStandardUrl(req),
    headers: req.headers,
    body: once(() => toStandardBody(req, { signal })),
    signal,
  }
}
