import type { StandardBody, StandardHeaders } from '@orpc/standard-server'
import type { Buffer } from 'node:buffer'
import type { ToEventStreamOptions } from './event-iterator'
import type { NodeHttpRequest } from './types'
import { Readable } from 'node:stream'
import { isAsyncIteratorObject, parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import { flattenHeader, generateContentDisposition, getFilenameFromContentDisposition } from '@orpc/standard-server'
import { toEventIterator, toEventStream } from './event-iterator'

export async function toStandardBody(req: NodeHttpRequest): Promise<StandardBody> {
  const contentDisposition = req.headers['content-disposition']
  const contentType = req.headers['content-type']

  if (typeof contentDisposition === 'string') {
    const fileName = getFilenameFromContentDisposition(contentDisposition) ?? 'blob'

    return _streamToFile(req, fileName, contentType ?? '')
  }

  if (!contentType || contentType.startsWith('application/json')) {
    const text = await _streamToString(req)
    return parseEmptyableJSON(text)
  }

  if (contentType.startsWith('multipart/form-data')) {
    return _streamToFormData(req, contentType)
  }

  if (contentType.startsWith('application/x-www-form-urlencoded')) {
    const text = await _streamToString(req)
    return new URLSearchParams(text)
  }

  if (contentType.startsWith('text/event-stream')) {
    return toEventIterator(req)
  }

  if (contentType.startsWith('text/plain')) {
    return _streamToString(req)
  }

  return _streamToFile(req, 'blob', contentType)
}

export interface ToNodeHttpBodyOptions extends ToEventStreamOptions {}

/**
 * @param body
 * @param headers - WARNING: The headers can be changed by the function and effects on the original headers.
 * @param options
 */
export function toNodeHttpBody(
  body: StandardBody,
  headers: StandardHeaders,
  options: ToNodeHttpBodyOptions = {},
): Readable | undefined | string {
  const currentContentDisposition = flattenHeader(headers['content-disposition'])

  delete headers['content-type']
  delete headers['content-disposition']

  if (body === undefined) {
    return
  }

  if (body instanceof Blob) {
    headers['content-type'] = body.type
    headers['content-length'] = body.size.toString()
    headers['content-disposition'] = currentContentDisposition ?? generateContentDisposition(body instanceof File ? body.name : 'blob')

    return Readable.fromWeb(body.stream())
  }

  if (body instanceof FormData) {
    const response = new Response(body)
    headers['content-type'] = response.headers.get('content-type')!

    return Readable.fromWeb(response.body!)
  }

  if (body instanceof URLSearchParams) {
    headers['content-type'] = 'application/x-www-form-urlencoded'

    return body.toString()
  }

  if (isAsyncIteratorObject(body)) {
    headers['content-type'] = 'text/event-stream'

    return toEventStream(body, options)
  }

  headers['content-type'] = 'application/json'

  return stringifyJSON(body)
}

function _streamToFormData(stream: Readable, contentType: string): Promise<FormData> {
  const response = new Response(stream, {
    headers: {
      'content-type': contentType,
    },
  })

  return response.formData()
}

async function _streamToString(stream: Readable): Promise<string> {
  let string = ''

  for await (const chunk of stream) {
    string += chunk.toString()
  }

  return string
}

async function _streamToFile(stream: Readable, fileName: string, contentType: string): Promise<File> {
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return new File(chunks, fileName, { type: contentType })
}
