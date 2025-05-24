import type { StandardResponse } from '@orpc/standard-server'
import type Stream from 'node:stream'
import type { ToLambdaBodyOptions } from './body'
import { toLambdaBody } from './body'
import { toLambdaHeaders } from './headers'

export interface SendStandardResponseOptions extends ToLambdaBodyOptions {}

export function sendStandardResponse(
  responseStream: Stream.Writable,
  standardResponse: StandardResponse,
  options: SendStandardResponseOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    responseStream.on('error', reject)
    responseStream.on('finish', resolve)

    const [body, standardHeaders] = toLambdaBody(standardResponse.body, standardResponse.headers, options)
    const [headers, cookies] = toLambdaHeaders(standardHeaders)

    responseStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: standardResponse.status,
      headers,
      cookies,
    })

    if (body === undefined) {
      responseStream.end()
    }
    else if (typeof body === 'string') {
      responseStream.write(body)
    }
    else {
      body.pipe(responseStream)
    }
  })
}
