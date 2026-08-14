import type { Context } from '@orpc/server'
import type { StandardHandlerOptions, StandardHandlerPlugin, StandardHandlerRoutingInterceptor } from '@orpc/server/standard'
import type { StandardBody, StandardBodyHint, StandardHeaders, StandardLazyRequest, StandardMethod } from '@standardserver/core'
import type { FilePropertyBag } from 'node:buffer'
import { Buffer } from 'node:buffer'
import { openAsBlob } from 'node:fs'
import { appendFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ORPCError } from '@orpc/server'
import { toArray } from '@orpc/shared'
import { flattenStandardHeader, getFilenameFromContentDisposition } from '@standardserver/core'
import { parseHeaderParameters, parseMultipart } from './multipart'

export interface TmpFileUploadHandlerPluginOptions {
  /**
   * The directory temporary files are created under. Each request that spools
   * an upload gets its own subdirectory inside it, removed when the request
   * finishes.
   *
   * @default os.tmpdir()
   */
  tmpDir?: string

  /**
   * The maximum allowed size in bytes of a single multipart field that is not
   * a file. Fields are buffered in memory, so this bounds the memory a request
   * can consume through them. A larger field rejects the request with
   * `PAYLOAD_TOO_LARGE`.
   *
   * @default Infinity
   */
  maxFieldSize?: number
}

/**
 * A `File` whose content lives in a temporary file on disk and is read lazily,
 * so it can represent an upload far larger than available memory.
 *
 * @see {@link https://orpc.dev/docs/plugins/tmp-file-upload | Tmp File Upload Plugin}
 */
export class TmpFile extends File {
  constructor(
    blob: Blob,
    /**
     * Absolute path of the temporary file holding this file's content.
     * The file is removed when the request finishes, so move or copy it
     * to keep the content. The `File` reads from this path, so it must
     * not be read after the file is moved or removed.
     */
    readonly path: string,
    name: string,
    options?: FilePropertyBag,
  ) {
    super([blob], name, options)
  }
}

/**
 * Parses file uploads into temporary files instead of memory. Bodies the standard
 * body parser would buffer into an in-memory `File`, and multipart file parts, are
 * streamed to disk and surfaced as lazily read {@link TmpFile} instances, so requests
 * far larger than available memory parse in constant memory. Every other body is left
 * to the standard parser.
 *
 * @remarks
 * Temporary files are removed when the request finishes, which is before the response
 * body is transmitted. A procedure that needs the content afterwards, e.g. to return
 * the upload in its response, must copy the content or move the file first.
 *
 * @see {@link https://orpc.dev/docs/plugins/tmp-file-upload | Tmp File Upload Plugin}
 */
export class TmpFileUploadHandlerPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  name = '~tmp-file-upload'

  /**
   * Should parse the original request body instead of batched sub-requests.
   */
  after = ['~batch']

  /**
   * Should run inside the limit and compression plugins, so spooling receives
   * the size-checked, decompressed bytes.
   */
  before = ['~request-limit', '~request-compression']

  private readonly tmpDir: string
  private readonly maxFieldSize: number

  constructor(options: TmpFileUploadHandlerPluginOptions = {}) {
    this.tmpDir = options.tmpDir ?? tmpdir()
    this.maxFieldSize = options.maxFieldSize ?? Number.POSITIVE_INFINITY
  }

  init(options: StandardHandlerOptions<T>): StandardHandlerOptions<T> {
    const routingInterceptor: StandardHandlerRoutingInterceptor<T> = async ({ next, ...interceptorOptions }) => {
      const tmpFiles = new RequestTmpFiles(this.tmpDir)

      try {
        return await next({
          ...interceptorOptions,
          request: {
            ...interceptorOptions.request,
            resolveBody: hint => this.resolveBody(interceptorOptions.request, hint, tmpFiles),
          },
        })
      }
      finally {
        await tmpFiles.cleanup()
      }
    }

    return {
      ...options,
      routingInterceptors: [routingInterceptor, ...toArray(options.routingInterceptors)],
    }
  }

  private async resolveBody(request: StandardLazyRequest, hint: StandardBodyHint | undefined, tmpFiles: RequestTmpFiles): Promise<StandardBody> {
    const kind = resolveUploadKind(hint, request.headers, request.method)

    if (kind === undefined) {
      return request.resolveBody(hint)
    }

    const stream = await request.resolveBody('octet-stream')

    // adapter might not support hint (e.g. peer adapter)
    if (!(stream instanceof ReadableStream)) {
      return stream
    }

    if (kind === 'file') {
      const contentDisposition = flattenStandardHeader(request.headers['content-disposition'])
      const fileName = contentDisposition !== undefined ? getFilenameFromContentDisposition(contentDisposition) : undefined
      const contentType = flattenStandardHeader(request.headers['content-type'])

      const tmpPath = await tmpFiles.allocate()

      for await (const chunk of stream) {
        await tmpFiles.append(tmpPath, chunk)
      }

      return tmpFiles.seal(tmpPath, fileName ?? 'blob', contentType ?? '')
    }

    return this.parseFormData(stream, tmpFiles, flattenStandardHeader(request.headers['content-type']))
  }

  private async parseFormData(stream: ReadableStream<Uint8Array>, tmpFiles: RequestTmpFiles, contentType: string | undefined): Promise<FormData> {
    const boundary = contentType === undefined ? undefined : parseHeaderParameters(contentType).get('boundary')

    if (boundary === undefined || boundary === '') {
      throw new TypeError('Invalid multipart body: content-type header is missing the boundary parameter')
    }

    const form = new FormData()

    await parseMultipart(stream, boundary, (part) => {
      const name = decodeContentDispositionParameter(part.name)

      if (part.filename === undefined) {
        const chunks: Buffer[] = []
        let size = 0

        return {
          write: (chunk) => {
            size += chunk.length

            if (size > this.maxFieldSize) {
              throw fieldTooLargeError(name)
            }

            // The parser only guarantees the chunk until write returns, so retaining it requires a copy
            chunks.push(Buffer.from(chunk))
          },
          end: () => {
            form.append(name, Buffer.concat(chunks).toString())
          },
        }
      }

      const filename = decodeContentDispositionParameter(part.filename)
      // A part without a content-type defaults to text/plain, matching the standard parser
      const type = part.type ?? 'text/plain'
      let tmpPath: string | undefined

      return {
        write: async (chunk) => {
          tmpPath ??= await tmpFiles.allocate()
          await tmpFiles.append(tmpPath, chunk)
        },
        end: async () => {
          tmpPath ??= await tmpFiles.allocate()
          form.append(name, await tmpFiles.seal(tmpPath, filename, type))
        },
      }
    })

    return form
  }
}

/**
 * The multipart serialization every spec-compliant client uses escapes `"`, `\r`,
 * and `\n` in content-disposition names and filenames as `%22`, `%0D`, and `%0A`,
 * and the standard parser reverses exactly these three, so the parser's undecoded
 * values need the same reversal.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#multipart/form-data-encoding-algorithm
 */
function decodeContentDispositionParameter(value: string): string {
  return value.replaceAll('%22', '"').replaceAll('%0D', '\r').replaceAll('%0A', '\n')
}

const EMPTY_CHUNK = new Uint8Array(0)

/**
 * Owns every temporary file a request creates: allocates them inside one lazily
 * created per-request directory and guarantees removal. Content lands through
 * self-contained appends rather than long-lived handles, so a request holds at
 * most one transient file descriptor per in-flight write no matter how many
 * files it carries, and removal never contends with an open handle on platforms
 * that cannot delete open files.
 *
 * Filesystem failures surface as `INTERNAL_SERVER_ERROR`, keeping them distinct
 * from the malformed-body errors the handler reports as `BAD_REQUEST`.
 */
class RequestTmpFiles {
  private dir: Promise<string> | undefined
  private count = 0

  constructor(private readonly tmpDir: string) {}

  async allocate(): Promise<string> {
    try {
      this.dir ??= mkdtemp(path.join(this.tmpDir, 'orpc-upload-'))
      return path.join(await this.dir, String(this.count++))
    }
    catch (cause) {
      throw toInternalError(cause)
    }
  }

  async append(tmpPath: string, chunk: Uint8Array): Promise<void> {
    try {
      await appendFile(tmpPath, chunk)
    }
    catch (cause) {
      throw toInternalError(cause)
    }
  }

  async seal(tmpPath: string, name: string, type: string): Promise<TmpFile> {
    try {
      // An empty upload never appended, so the backing file may not exist yet
      await appendFile(tmpPath, EMPTY_CHUNK)
      return new TmpFile(await openAsBlob(tmpPath), tmpPath, name, { type })
    }
    catch (cause) {
      throw toInternalError(cause)
    }
  }

  async cleanup(): Promise<void> {
    if (this.dir !== undefined) {
      try {
        await rm(await this.dir, { recursive: true, force: true })
      }
      catch {
        // The request outcome must not change because removal failed
      }
    }
  }
}

function toInternalError(cause: unknown): ORPCError<'INTERNAL_SERVER_ERROR', undefined> {
  return new ORPCError('INTERNAL_SERVER_ERROR', {
    message: 'Failed to store the request body in a temporary file.',
    cause,
  })
}

function fieldTooLargeError(name: string): ORPCError<'PAYLOAD_TOO_LARGE', undefined> {
  return new ORPCError('PAYLOAD_TOO_LARGE', {
    message: `Multipart field "${name}" exceeds the maximum allowed field size.`,
  })
}

/**
 * Mirrors the decision order of the standard body parsers, so exactly the bodies
 * they would buffer into memory as a `File`, and multipart bodies, are taken over.
 *
 * @see https://github.com/middleapi/standardserver/blob/main/packages/node/src/body.ts
 */
function resolveUploadKind(hint: StandardBodyHint | undefined, headers: StandardHeaders, method: StandardMethod): 'file' | 'form-data' | undefined {
  hint ??= flattenStandardHeader(headers['standard-server']) as StandardBodyHint | undefined

  const mimeType = flattenStandardHeader(headers['content-type'])?.split(';')[0]?.trim()
  const contentLength = flattenStandardHeader(headers['content-length'])

  if (hint === 'none' || (hint === undefined && mimeType === undefined && (contentLength === '0' || contentLength === undefined))) {
    return undefined
  }

  if (hint === undefined && (method === 'GET' || method === 'HEAD')) {
    return undefined
  }

  if (hint === 'json' || (hint === undefined && mimeType === 'application/json')) {
    return undefined
  }

  /**
   * Only multipart bodies are taken over. Other bodies the standard parser can
   * produce form data from under this hint, such as urlencoded ones, stay with it.
   */
  if ((hint === 'form-data' || hint === undefined) && mimeType === 'multipart/form-data') {
    return 'form-data'
  }

  if (hint === 'url-search-params' || (hint === undefined && mimeType === 'application/x-www-form-urlencoded')) {
    return undefined
  }

  if (hint === 'event-stream' || (hint === undefined && mimeType === 'text/event-stream')) {
    return undefined
  }

  if (hint === 'file' || (hint === undefined && contentLength !== undefined)) {
    return 'file'
  }

  return undefined
}
