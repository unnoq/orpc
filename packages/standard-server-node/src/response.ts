import type { StandardHeaders, StandardResponse } from '@orpc/standard-server'
import type { ToNodeHttpBodyOptions } from './body'
import type { NodeHttpResponse } from './types'
import { toNodeHttpBody } from './body'

export interface SendStandardResponseOptions extends ToNodeHttpBodyOptions {}

export function sendStandardResponse(
  res: NodeHttpResponse,
  standardResponse: StandardResponse,
  options: SendStandardResponseOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    res.once('error', reject)
    res.once('close', resolve)

    const resHeaders: StandardHeaders = { ...standardResponse.headers }

    const resBody = toNodeHttpBody(standardResponse.body, resHeaders, options)

    res.writeHead(standardResponse.status, resHeaders)

    if (resBody === undefined) {
      res.end()
    }
    else if (typeof resBody === 'string') {
      res.end(resBody)
    }
    else {
      res.once('close', () => {
        if (!resBody.closed) {
          resBody.destroy(res.errored ?? undefined)
        }
      })

      resBody.once('error', error => res.destroy(error))

      resBody.pipe(res)
    }
  })
}
