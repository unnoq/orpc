import type { StandardBody, StandardHeaders } from '@orpc/standard-server'
import type { ToEventStreamOptions } from './event-iterator'
import type { APIGatewayProxyEventV2 } from './types'
import { Buffer } from 'node:buffer'
import { Readable } from 'node:stream'
import { isAsyncIteratorObject, parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import { flattenHeader, generateContentDisposition, getFilenameFromContentDisposition } from '@orpc/standard-server'
import { toEventIterator, toEventStream } from './event-iterator'

export async function toStandardBody(event: APIGatewayProxyEventV2): Promise<StandardBody> {
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
    return toEventIterator(_parseAsString(event.body, event.isBase64Encoded))
  }

  if (contentType.startsWith('text/plain')) {
    return _parseAsString(event.body, event.isBase64Encoded)
  }

  return _parseAsFile(event.body, event.isBase64Encoded, 'blob', contentType)
}

export interface ToLambdaBodyOptions extends ToEventStreamOptions { }

export function toLambdaBody(
  body: StandardBody,
  headers: StandardHeaders,
  options: ToLambdaBodyOptions = {},
): [body: undefined | string | Readable, headers: StandardHeaders] {
  const currentContentDisposition = flattenHeader(headers['content-disposition'])
  headers = { ...headers, 'content-type': undefined, 'content-disposition': undefined }

  if (body === undefined) {
    return [undefined, headers]
  }

  if (body instanceof Blob) {
    headers['content-type'] = body.type
    headers['content-length'] = body.size.toString()
    headers['content-disposition'] = currentContentDisposition ?? generateContentDisposition(body instanceof File ? body.name : 'blob')

    return [Readable.fromWeb(body.stream()), headers]
  }

  if (body instanceof FormData) {
    const response = new Response(body)
    headers['content-type'] = response.headers.get('content-type')!

    return [Readable.fromWeb(response.body!), headers]
  }

  if (body instanceof URLSearchParams) {
    headers['content-type'] = 'application/x-www-form-urlencoded'

    return [body.toString(), headers]
  }

  if (isAsyncIteratorObject(body)) {
    headers['content-type'] = 'text/event-stream'
    headers['cache-control'] = 'no-cache'
    headers.connection = 'keep-alive'

    return [toEventStream(body, options), headers]
  }

  headers['content-type'] = 'application/json'

  return [stringifyJSON(body), headers]
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
