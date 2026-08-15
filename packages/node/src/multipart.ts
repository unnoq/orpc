import { Buffer } from 'node:buffer'

/**
 * Part headers are tiny in practice, so an unterminated header block is cut off
 * long before it can buffer a request-sized payload in memory.
 */
const MAX_PART_HEADER_SIZE = 16 * 1024

const CRLF = Buffer.from('\r\n')
const HEADER_BLOCK_END = Buffer.from('\r\n\r\n')

export interface MultipartPart {
  /**
   * The `name` parameter of the part's `Content-Disposition` header, with the
   * serialization escapes of `"`, `\r`, and `\n` decoded.
   */
  name: string

  /**
   * The `filename` parameter of the part's `Content-Disposition` header,
   * decoded like `name`, or `undefined` when the part is a plain field. An
   * empty string is a file part, matching how browsers submit an empty file
   * input.
   */
  filename: string | undefined

  /**
   * The part's `Content-Type` header value, if present.
   */
  type: string | undefined
}

export interface MultipartPartWriter {
  /**
   * Receives one chunk of the part's body. The chunk is only valid until the
   * returned promise resolves, so it must be consumed or copied synchronously.
   */
  write(chunk: Buffer): void | Promise<void>

  /**
   * Called once after the part's final chunk.
   */
  end(): void | Promise<void>
}

/**
 * Parses a `multipart/form-data` byte stream part by part, so a part's body can be
 * consumed as it arrives instead of being buffered whole. Bodies are delivered to the
 * writer `onPart` returns, with writer promises awaited for backpressure, so parts are
 * processed strictly one at a time.
 *
 * Line endings are strictly CRLF, every part must carry a `form-data` content
 * disposition with a `name` parameter, and a malformed or truncated body throws a
 * `TypeError`, matching the standard parser's strictness.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7578
 * @see https://www.rfc-editor.org/rfc/rfc2046#section-5.1.1
 */
export async function parseMultipart(
  source: ReadableStream<Uint8Array>,
  boundary: string,
  onPart: (part: MultipartPart) => MultipartPartWriter | Promise<MultipartPartWriter>,
): Promise<void> {
  const delimiter = Buffer.from(`\r\n--${boundary}`)

  /**
   * Seeded with a virtual CRLF so the opening `--boundary` line, which the grammar
   * allows without a preceding line break, matches the same needle as every
   * later delimiter.
   */
  let buffer: Buffer = CRLF
  let state: 'preamble' | 'delimiter-end' | 'headers' | 'body' = 'preamble'
  let writer: MultipartPartWriter | undefined
  let done = false

  const process = async (): Promise<void> => {
    while (true) {
      if (state === 'preamble' || state === 'body') {
        const index = buffer.indexOf(delimiter)

        if (index === -1) {
          // All bytes except a possible delimiter prefix are settled and can be flushed
          const settledLength = buffer.length - delimiter.length + 1

          if (settledLength > 0) {
            if (state === 'body') {
              await writer!.write(buffer.subarray(0, settledLength))
            }

            buffer = buffer.subarray(settledLength)
          }

          return
        }

        if (state === 'body') {
          if (index > 0) {
            await writer!.write(buffer.subarray(0, index))
          }

          await writer!.end()
          writer = undefined
        }

        buffer = buffer.subarray(index + delimiter.length)
        state = 'delimiter-end'
        continue
      }

      if (state === 'delimiter-end') {
        if (buffer.length < 2) {
          return
        }

        // A close delimiter is `--` immediately after the boundary, everything after it is epilogue
        if (buffer[0] === 0x2D && buffer[1] === 0x2D) {
          done = true
          buffer = Buffer.alloc(0)
          return
        }

        let index = 0
        while (index < buffer.length && (buffer[index] === 0x20 || buffer[index] === 0x09)) {
          index++
        }

        if (index + 1 >= buffer.length) {
          return
        }

        if (buffer[index] !== 0x0D || buffer[index + 1] !== 0x0A) {
          throw new TypeError('Invalid multipart body: expected CRLF after a boundary delimiter')
        }

        buffer = buffer.subarray(index + 2)
        state = 'headers'
        continue
      }

      // A part without headers can never carry the required content-disposition
      if (buffer[0] === 0x0D && buffer[1] === 0x0A) {
        throw new TypeError('Invalid multipart body: part is missing the content-disposition header')
      }

      const headerEnd = buffer.indexOf(HEADER_BLOCK_END)

      if (headerEnd === -1) {
        if (buffer.length > MAX_PART_HEADER_SIZE) {
          throw new TypeError('Invalid multipart body: part headers exceed the maximum allowed size')
        }

        return
      }

      const part = parsePartHeaders(buffer.subarray(0, headerEnd).toString())
      buffer = buffer.subarray(headerEnd + HEADER_BLOCK_END.length)
      writer = await onPart(part)
      state = 'body'
    }
  }

  for await (const chunk of source) {
    if (done) {
      continue
    }

    // A bare view suffices when nothing is retained, skipping a copy
    buffer = buffer.length === 0
      ? Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      : Buffer.concat([buffer, chunk])
    await process()
  }

  if (!done) {
    throw new TypeError('Invalid multipart body: unexpected end of body')
  }
}

function parsePartHeaders(block: string): MultipartPart {
  let contentDisposition: string | undefined
  let contentType: string | undefined

  for (const line of block.split('\r\n')) {
    const colon = line.indexOf(':')

    if (colon === -1) {
      throw new TypeError('Invalid multipart body: malformed part header')
    }

    const name = line.slice(0, colon).trim().toLowerCase()

    if (name === 'content-disposition') {
      contentDisposition = line.slice(colon + 1).trim()
    }
    else if (name === 'content-type') {
      contentType = line.slice(colon + 1).trim()
    }
  }

  if (contentDisposition === undefined) {
    throw new TypeError('Invalid multipart body: part is missing the content-disposition header')
  }

  // The standard parser accepts no disposition type other than form-data, case-insensitively
  const semicolon = contentDisposition.indexOf(';')
  const dispositionType = (semicolon === -1 ? contentDisposition : contentDisposition.slice(0, semicolon)).trim().toLowerCase()

  if (dispositionType !== 'form-data') {
    throw new TypeError('Invalid multipart body: content-disposition must be form-data')
  }

  const parameters = parseHeaderParameters(contentDisposition)
  const name = parameters.get('name')

  if (name === undefined) {
    throw new TypeError('Invalid multipart body: content-disposition header is missing the name parameter')
  }

  const filename = parameters.get('filename')

  return {
    name: decodeContentDispositionParameter(name),
    filename: filename === undefined ? undefined : decodeContentDispositionParameter(filename),
    type: contentType,
  }
}

/**
 * The multipart serialization every spec-compliant client uses escapes `"`, `\r`,
 * and `\n` in content-disposition names and filenames as `%22`, `%0D`, and `%0A`,
 * and the standard parser reverses exactly these three.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#multipart/form-data-encoding-algorithm
 */
function decodeContentDispositionParameter(value: string): string {
  return value.replaceAll('%22', '"').replaceAll('%0D', '\r').replaceAll('%0A', '\n')
}

/**
 * Extracts the `key=value` parameters that follow a header's leading token.
 * The first occurrence of a parameter wins.
 *
 * A backslash inside a quoted value is a literal character rather than an
 * escape, matching the standard parser: the multipart serialization escapes
 * `"` as `%22`, so a quote can never occur inside a value, while filenames
 * with literal backslashes are common and must survive verbatim.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#multipart/form-data-encoding-algorithm
 */
export function parseHeaderParameters(header: string): Map<string, string> {
  const parameters = new Map<string, string>()

  let index = header.indexOf(';')

  while (index !== -1 && index < header.length) {
    index++

    while (index < header.length && (header[index] === ' ' || header[index] === '\t')) {
      index++
    }

    const equals = header.indexOf('=', index)
    const nextSemicolon = header.indexOf(';', index)

    // A parameter without a value ends at the next semicolon and is skipped
    if (equals === -1 || (nextSemicolon !== -1 && nextSemicolon < equals)) {
      if (nextSemicolon === -1) {
        break
      }

      index = nextSemicolon
      continue
    }

    const key = header.slice(index, equals).trim().toLowerCase()
    index = equals + 1

    let value: string

    if (header[index] === '"') {
      const closing = header.indexOf('"', index + 1)
      value = closing === -1 ? header.slice(index + 1) : header.slice(index + 1, closing)
      index = closing === -1 ? -1 : header.indexOf(';', closing + 1)
    }
    else {
      const semicolon = header.indexOf(';', index)
      value = (semicolon === -1 ? header.slice(index) : header.slice(index, semicolon)).trim()
      index = semicolon
    }

    if (!parameters.has(key)) {
      parameters.set(key, value)
    }
  }

  return parameters
}
