import type { StandardBody, StandardHeaders } from '@orpc/standard-server'
import type { ToNodeHttpBodyOptions } from '@orpc/standard-server-node'
import type { Readable } from 'node:stream'
import type { ToEventIteratorOptions } from './event-iterator'
import type { APIGatewayProxyEventV2 } from './types'
import { Buffer } from 'node:buffer'
import { parseEmptyableJSON, runWithSpan } from '@orpc/shared'
import { getFilenameFromContentDisposition } from '@orpc/standard-server'
import { toNodeHttpBody } from '@orpc/standard-server-node'
import { toEventIterator } from './event-iterator'

export interface ToStandardBodyOptions extends ToEventIteratorOptions {}

export function toStandardBody(
  event: APIGatewayProxyEventV2,
  options: ToStandardBodyOptions = {},
): Promise<StandardBody> {
  return runWithSpan({ name: 'parse_standard_body', signal: options.signal }, async () => {
    const contentType = event.headers['content-type']
    const contentDisposition = event.headers['content-disposition']

    if (typeof contentDisposition === 'string') {
      const fileName = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'

      return _parseAsFile(event.body, event.isBase64Encoded, fileName, contentType ?? '')
    }

    if (!contentType || contentType.startsWith('application/json')) {
      const text = _parseAsString(event.body, event.isBase64Encoded)
      return parseEmptyableJSON(text)
    }

    if (contentType.startsWith('multipart/form-data')) {
      return _parseAsFormData(event.body, event.isBase64Encoded, contentType)
    }

    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      return new URLSearchParams(_parseAsString(event.body, event.isBase64Encoded))
    }

    if (contentType.startsWith('text/event-stream')) {
      return toEventIterator(_parseAsString(event.body, event.isBase64Encoded), options)
    }

    if (contentType.startsWith('text/plain')) {
      return _parseAsString(event.body, event.isBase64Encoded)
    }

    return _parseAsFile(event.body, event.isBase64Encoded, 'blob', contentType)
  })
}

export interface ToLambdaBodyOptions extends ToNodeHttpBodyOptions {}

export function toLambdaBody(
  standardBody: StandardBody,
  standardHeaders: StandardHeaders,
  options: ToLambdaBodyOptions = {},
): [body: undefined | string | Readable, headers: StandardHeaders] {
  standardHeaders = { ...standardHeaders }
  const body = toNodeHttpBody(standardBody, standardHeaders, options)
  return [body, standardHeaders]
}

function _parseAsFile(body: string | undefined, isBase64Encoded: boolean, fileName: string, contentType: string): File {
  return new File(
    body === undefined
      ? []
      : [isBase64Encoded ? Buffer.from(body, 'base64') : body],
    fileName,
    { type: contentType },
  )
}

function _parseAsString(body: string | undefined, isBase64Encoded: boolean): string | undefined {
  return isBase64Encoded && body !== undefined ? Buffer.from(body, 'base64').toString() : body
}

function _parseAsFormData(body: string | undefined, isBase64Encoded: boolean, contentType: string): Promise<FormData> {
  const blobPart = isBase64Encoded && body !== undefined ? Buffer.from(body, 'base64') : body
  const response = new Response(blobPart, {
    headers: {
      'content-type': contentType,
    },
  })

  return response.formData()
}
