import type { IncomingMessage, ServerResponse } from 'node:http'
import { Buffer } from 'node:buffer'
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { RPCSerializer } from '@orpc/client'
import { ORPCError, os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/node'
import { generateContentDisposition } from '@standardserver/core'
import request from 'supertest'
import { TmpFile, TmpFileUploadHandlerPlugin } from './tmp-file-upload-handler-plugin'

describe('tmpFileUploadHandlerPlugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'orpc-tmp-file-upload-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  interface Captured {
    input: unknown
    /** Whether every `TmpFile` reachable from the input existed while the procedure ran. */
    filesExisted: boolean
    /** The content of each reachable `TmpFile`, read while the procedure ran. */
    fileContents: Buffer[]
    tmpDirEntries: string[]
  }

  function createAgent(options: { maxFieldSize?: number, onInput?: (input: any) => unknown } = {}) {
    const captured: Captured[] = []

    const handler = new RPCHandler({
      upload: os.handler(async ({ input }) => {
        const files: TmpFile[] = []
        const visit = (value: unknown): void => {
          if (value instanceof TmpFile) {
            files.push(value)
          }
          else if (value !== null && typeof value === 'object' && !(value instanceof Blob)) {
            Object.values(value).forEach(visit)
          }
        }
        visit(input)

        captured.push({
          input,
          filesExisted: files.every(file => existsSync(file.path)),
          fileContents: await Promise.all(files.map(async file => Buffer.from(await file.arrayBuffer()))),
          tmpDirEntries: readdirSync(tmpDir),
        })

        return options.onInput?.(input) ?? { ok: true }
      }),
    }, {
      plugins: [new TmpFileUploadHandlerPlugin({ tmpDir, maxFieldSize: options.maxFieldSize })],
    })

    const agent = request(createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const result = await handler.handle(req, res, { context: {} })

      if (!result.matched) {
        res.statusCode = 404
        res.end('not matched')
      }
    }))

    return { agent, captured }
  }

  it('spools a file body to a tmp file and removes it when the request finishes', async () => {
    const { agent, captured } = createAgent()
    const content = Buffer.alloc(1024 * 1024 + 3, 7)

    const res = await agent
      .post('/upload')
      .set('content-type', 'application/pdf')
      .set('content-disposition', generateContentDisposition('tệp tin 🚀.pdf', 'attachment'))
      .send(content)

    expect(res.status).toBe(200)

    const file = captured[0]!.input as TmpFile
    expect(file).toBeInstanceOf(TmpFile)
    expect(file.name).toBe('tệp tin 🚀.pdf')
    expect(file.type).toBe('application/pdf')
    expect(file.size).toBe(content.length)
    expect(path.dirname(path.dirname(file.path))).toBe(tmpDir)
    expect(captured[0]!.fileContents[0]!.equals(content)).toBe(true)

    // The tmp file existed while the procedure ran and is gone once the request finished
    expect(captured[0]!.filesExisted).toBe(true)
    expect(captured[0]!.tmpDirEntries).toHaveLength(1)
    expect(readdirSync(tmpDir)).toHaveLength(0)
    expect(existsSync(file.path)).toBe(false)

    // Once the request finished the backing file is gone, so the File can no longer be read
    await expect(file.text()).rejects.toThrow()
  })

  it('defaults the file name when the request carries no content-disposition', async () => {
    const { agent, captured } = createAgent()

    const res = await agent
      .post('/upload')
      .set('content-type', 'application/octet-stream')
      .send(Buffer.from('binary'))

    expect(res.status).toBe(200)

    const file = captured[0]!.input as TmpFile
    expect(file).toBeInstanceOf(TmpFile)
    expect(file.name).toBe('blob')
    expect(captured[0]!.fileContents[0]!.toString()).toBe('binary')
  })

  it('spools an empty file body requested through the standard-server hint header', async () => {
    const { agent, captured } = createAgent()

    const res = await agent
      .post('/upload')
      .set('content-type', 'application/octet-stream')
      .set('standard-server', 'file')
      .send(Buffer.alloc(0))

    expect(res.status).toBe(200)

    const file = captured[0]!.input as TmpFile
    expect(file).toBeInstanceOf(TmpFile)
    expect(file.size).toBe(0)
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  it('spools multipart file parts to tmp files and preserves them through deserialization', async () => {
    const { agent, captured } = createAgent()

    const content = Buffer.alloc(64 * 1024).map((_, i) => i % 251)
    const serialized = new RPCSerializer().serialize({
      meta: 'nested 🚀 value',
      file: new File([content], 'dữ liệu 🚀.bin', { type: 'application/octet-stream' }),
    }) as FormData

    const response = new Response(serialized)
    const body = Buffer.from(await response.arrayBuffer())

    const res = await agent
      .post('/upload')
      .set('content-type', response.headers.get('content-type')!)
      .send(body)

    expect(res.status).toBe(200)

    const input = captured[0]!.input as { meta: string, file: TmpFile }
    expect(input.meta).toBe('nested 🚀 value')
    expect(input.file).toBeInstanceOf(TmpFile)
    expect(input.file.name).toBe('dữ liệu 🚀.bin')
    expect(input.file.type).toBe('application/octet-stream')
    expect(input.file.size).toBe(content.length)
    expect(captured[0]!.fileContents[0]!.equals(content)).toBe(true)

    expect(captured[0]!.filesExisted).toBe(true)
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  it('leaves json bodies to the standard parser and creates no tmp files for them', async () => {
    const { agent, captured } = createAgent()

    const res = await agent
      .post('/upload')
      .set('content-type', 'application/json')
      .send({ json: { hello: 'world' } })

    expect(res.status).toBe(200)
    expect(captured[0]!.input).toEqual({ hello: 'world' })
    expect(captured[0]!.tmpDirEntries).toHaveLength(0)
  })

  it('rejects a malformed multipart body and still removes already spooled parts', async () => {
    const { agent, captured } = createAgent()

    const boundary = 'X-TEST-BOUNDARY'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="0"; filename="a.bin"',
      '',
      'spooled before the malformed tail',
      `--${boundary}`,
      'this-part-has-no-valid-header',
      '',
    ].join('\r\n')

    const res = await agent
      .post('/upload')
      .set('content-type', `multipart/form-data; boundary=${boundary}`)
      .send(Buffer.from(body))

    expect(res.status).toBe(400)
    expect(res.body.json.message).toContain('Malformed request')
    expect(captured).toHaveLength(0)
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  it('rejects a multipart body without a boundary parameter', async () => {
    const { agent } = createAgent()

    const res = await agent
      .post('/upload')
      .set('content-type', 'multipart/form-data')
      .send(Buffer.from('irrelevant'))

    expect(res.status).toBe(400)
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  it('rejects a multipart field larger than maxFieldSize with PAYLOAD_TOO_LARGE', async () => {
    const { agent, captured } = createAgent({ maxFieldSize: 10 })

    const boundary = 'X-TEST-BOUNDARY'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="field"',
      '',
      'x'.repeat(11),
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const res = await agent
      .post('/upload')
      .set('content-type', `multipart/form-data; boundary=${boundary}`)
      .send(Buffer.from(body))

    expect(res.status).toBe(413)
    expect(res.body.json.code).toBe('PAYLOAD_TOO_LARGE')
    expect(captured).toHaveLength(0)
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  it('removes tmp files when the procedure throws', async () => {
    const { agent, captured } = createAgent({
      onInput: () => {
        throw new Error('procedure failed')
      },
    })

    const res = await agent
      .post('/upload')
      .set('content-type', 'application/octet-stream')
      .send(Buffer.alloc(1024, 1))

    expect(res.status).toBe(500)
    expect(captured[0]!.filesExisted).toBe(true)
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  it('passes through bodies an adapter resolved without a stream', async () => {
    const plugin = new TmpFileUploadHandlerPlugin({ tmpDir })
    const options = plugin.init({})
    const interceptor = options.routingInterceptors![0]!

    const preParsed = new FormData()
    preParsed.append('already', 'parsed')

    const result = await interceptor({
      context: {},
      prefix: undefined,
      request: {
        method: 'POST',
        url: '/upload',
        headers: { 'content-type': 'multipart/form-data; boundary=x' },
        resolveBody: async () => preParsed,
      },
      next: async (nextOptions) => {
        expect(await nextOptions!.request.resolveBody()).toBe(preParsed)
        return { matched: false }
      },
    })

    expect(result).toEqual({ matched: false })
    expect(readdirSync(tmpDir)).toHaveLength(0)
  })

  describe('multipart parsing parity with the standard parser', () => {
    type MaterializedEntry
      = | { kind: 'field', name: string, value: string }
        | { kind: 'file', name: string, fileName: string, type: string, content: Buffer, isTmpFile: boolean }

    function toStream(body: Buffer, chunkSize: number, delivery: 'sync' | 'async' = 'sync'): ReadableStream<Uint8Array> {
      let offset = 0

      return new ReadableStream({
        async pull(controller) {
          if (delivery === 'async') {
            await new Promise<void>(resolve => setImmediate(resolve))
          }

          if (offset >= body.length) {
            controller.close()
            return
          }

          controller.enqueue(body.subarray(offset, offset += chunkSize))
        },
      })
    }

    /**
     * Runs a raw multipart body through the plugin's routing interceptor and
     * materializes the parsed entries while the request scope is still open,
     * because the backing tmp files vanish once the interceptor finishes.
     */
    async function parseThroughPlugin(body: Buffer, contentType: string, options: { chunkSize?: number, maxFieldSize?: number, delivery?: 'sync' | 'async' } = {}): Promise<MaterializedEntry[]> {
      const plugin = new TmpFileUploadHandlerPlugin({ tmpDir, maxFieldSize: options.maxFieldSize })
      const interceptor = plugin.init({}).routingInterceptors![0]!

      let entries: MaterializedEntry[]

      await interceptor({
        context: {},
        prefix: undefined,
        request: {
          method: 'POST',
          url: '/upload',
          headers: { 'content-type': contentType },
          resolveBody: async () => toStream(body, options.chunkSize ?? 16, options.delivery),
        },
        next: async (nextOptions) => {
          const form = await nextOptions!.request.resolveBody() as FormData

          entries = await Promise.all([...form].map(async ([name, value]) => typeof value === 'string'
            ? { kind: 'field' as const, name, value }
            : {
                kind: 'file' as const,
                name,
                fileName: value.name,
                type: value.type,
                content: Buffer.from(await value.arrayBuffer()),
                isTmpFile: value instanceof TmpFile,
              }))

          return { matched: false }
        },
      })

      return entries!
    }

    async function expectMatchesStandardParser(form: FormData, chunkSizes: number[], delivery?: 'sync' | 'async'): Promise<void> {
      const response = new Response(form)
      const contentType = response.headers.get('content-type')!
      const body = Buffer.from(await response.arrayBuffer())

      const expectedEntries = [...await new Response(body, { headers: { 'content-type': contentType } }).formData()]

      for (const chunkSize of chunkSizes) {
        const entries = await parseThroughPlugin(body, contentType, { chunkSize, delivery })

        expect(entries).toHaveLength(expectedEntries.length)

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]!
          const [expectedName, expectedValue] = expectedEntries[i]!

          expect(entry.name).toBe(expectedName)

          if (typeof expectedValue === 'string') {
            expect(entry).toMatchObject({ kind: 'field', value: expectedValue })
          }
          else {
            expect(entry).toMatchObject({ kind: 'file', fileName: expectedValue.name, type: expectedValue.type, isTmpFile: true })
            expect((entry as { content: Buffer }).content.equals(Buffer.from(await expectedValue.arrayBuffer()))).toBe(true)
          }
        }
      }
    }

    it('parses what the standard parser parses, preserving entry order', async () => {
      const form = new FormData()
      form.append('field', 'value')
      form.append('unicode', 'tiếng Việt 🚀')
      form.append('mixed', 'before the file')
      form.append('mixed', new File(['file content'], 'tệp tin 🚀.txt', { type: 'text/plain' }))
      form.append('mixed', 'after the file')
      form.append('binary', new File([new Uint8Array([0, 1, 2, 253, 254, 255])], 'raw.bin', { type: 'application/octet-stream' }))
      form.append('empty', new File([], 'empty.bin'))
      // Escaped by the serializer as %22, %0D, and %0A, and decoded back by parsers
      form.append('quo"ted\nname', 'value')
      form.append('escapes', new File(['x'], 'my "quoted"\r\nfile.txt', { type: 'text/plain' }))
      // Path segments stay in filenames, as browser directory uploads rely on
      form.append('paths', new File(['y'], 'photos/2024/img.png', { type: 'image/png' }))
      form.append('paths', new File(['z'], 'C:\\tmp\\a.png', { type: 'image/png' }))

      await expectMatchesStandardParser(form, [1, 2, 3, 7, 64, 1024, 1024 * 1024])
      await expectMatchesStandardParser(form, [1, 3, 61], 'async')
    })

    it('parses an empty form and a drip-fed body whose epilogue arrives in its own chunks', async () => {
      // An empty form is nothing but the close delimiter, allowed without a preceding line break
      await expectMatchesStandardParser(new FormData(), [1, 2, 1024])
      await expectMatchesStandardParser(new FormData(), [1], 'async')

      /**
       * The trailing CRLF after the close delimiter lands in separate slowly
       * delivered chunks. Event-driven parsers can wedge permanently on bytes
       * arriving after their close delimiter, so the epilogue handling is pinned
       * against exactly this delivery pattern.
       */
      const form = new FormData()
      form.append('field', 'value')
      form.append('file', new File([new Uint8Array(4096).fill(7)], 'a.bin', { type: 'application/octet-stream' }))

      await expectMatchesStandardParser(form, [1, 2, 3], 'async')
    })

    it('parses randomized forms identically at randomized chunk sizes', async () => {
      // Deterministic PRNG so a failure reproduces
      let seed = 0x2F6E2B1
      const random = (): number => {
        seed = (seed * 1664525 + 1013904223) % 4294967296
        return seed / 4294967296
      }

      const fragments = ['\r', '\n', '\r\n', '--', '\r\n--', 'formdata-', 'a', '"', ';', 'é', '🚀', '\0', '\r\n--formdata']

      for (let iteration = 0; iteration < 10; iteration++) {
        const form = new FormData()
        const partCount = 1 + Math.floor(random() * 6)

        for (let i = 0; i < partCount; i++) {
          let content = ''
          const fragmentCount = Math.floor(random() * 200)
          for (let j = 0; j < fragmentCount; j++) {
            content += fragments[Math.floor(random() * fragments.length)]
          }

          if (random() < 0.5) {
            form.append(`field-${i}`, content)
          }
          else {
            form.append(`file-${i}`, new File([content], `file-${i}.bin`, { type: random() < 0.5 ? 'application/octet-stream' : '' }))
          }
        }

        const chunkSize = [1, 2, 3, 5, 8, 64, 997, 8192][Math.floor(random() * 8)]!
        await expectMatchesStandardParser(form, [chunkSize], iteration % 2 === 0 ? 'async' : 'sync')
      }
    })

    it('treats an octet-stream part without a filename as a plain field', async () => {
      const boundary = 'X-TEST-BOUNDARY'
      const body = Buffer.from([
        `--${boundary}`,
        'Content-Disposition: form-data; name="octet"',
        'Content-Type: application/octet-stream',
        '',
        'still a field',
        `--${boundary}--`,
        '',
      ].join('\r\n'))

      const entries = await parseThroughPlugin(body, `multipart/form-data; boundary=${boundary}`)
      expect(entries).toEqual([{ kind: 'field', name: 'octet', value: 'still a field' }])

      // The field limit applies to it like any other field
      await expect(parseThroughPlugin(body, `multipart/form-data; boundary=${boundary}`, { maxFieldSize: 5 }))
        .rejects
        .toSatisfy(error => error instanceof ORPCError && error.code === 'PAYLOAD_TOO_LARGE')

      expect(readdirSync(tmpDir)).toHaveLength(0)
    })

    it('keeps semicolons and backslashes in quoted content-disposition parameters', async () => {
      const boundary = 'X-TEST-BOUNDARY'
      const body = Buffer.from([
        `--${boundary}`,
        'Content-Disposition: form-data; name="quoted"; filename="fi;\\le .txt"',
        '',
        'v',
        `--${boundary}--`,
        '',
      ].join('\r\n'))

      const contentType = `multipart/form-data; boundary=${boundary}`
      const expected = await new Response(body, { headers: { 'content-type': contentType } }).formData()

      const entries = await parseThroughPlugin(body, contentType)
      expect(entries).toMatchObject([{ kind: 'file', name: 'quoted', fileName: (expected.get('quoted') as File).name }])
      expect(entries[0]).toMatchObject({ fileName: 'fi;\\le .txt' })
    })

    it('parses a quoted boundary parameter, drip-fed through the epilogue', async () => {
      const body = Buffer.from([
        '--quoted boundary',
        'Content-Disposition: form-data; name="field"',
        '',
        'value',
        '--quoted boundary--',
        '',
      ].join('\r\n'))

      // The boundary parameter may be quoted, with characters a bare token forbids
      const entries = await parseThroughPlugin(body, 'multipart/form-data; boundary="quoted boundary"', { chunkSize: 2, delivery: 'async' })
      expect(entries).toEqual([{ kind: 'field', name: 'field', value: 'value' }])
    })

    it('rejects a part whose content-disposition has no name parameter, like the standard parser', async () => {
      const boundary = 'X-TEST-BOUNDARY'
      const body = Buffer.from([
        `--${boundary}`,
        'Content-Disposition: form-data; filename="a.txt"',
        '',
        'v',
        `--${boundary}--`,
        '',
      ].join('\r\n'))

      const contentType = `multipart/form-data; boundary=${boundary}`
      await expect(new Response(body, { headers: { 'content-type': contentType } }).formData()).rejects.toThrow()
      await expect(parseThroughPlugin(body, contentType)).rejects.toThrow('name parameter')
      expect(readdirSync(tmpDir)).toHaveLength(0)

      const { agent, captured } = createAgent()
      const res = await agent.post('/upload').set('content-type', contentType).send(body)
      expect(res.status).toBe(400)
      expect(captured).toHaveLength(0)
    })

    it('rejects parts without a form-data content-disposition, like the standard parser', async () => {
      const boundary = 'X-TEST-BOUNDARY'
      const contentType = `multipart/form-data; boundary=${boundary}`

      const withoutDisposition = Buffer.from([
        `--${boundary}`,
        'Content-Type: text/plain',
        '',
        'no disposition at all',
        `--${boundary}--`,
        '',
      ].join('\r\n'))

      const wrongDisposition = Buffer.from([
        `--${boundary}`,
        'Content-Disposition: attachment; name="x"',
        '',
        'wrong disposition',
        `--${boundary}--`,
        '',
      ].join('\r\n'))

      for (const body of [withoutDisposition, wrongDisposition]) {
        await expect(new Response(body, { headers: { 'content-type': contentType } }).formData()).rejects.toThrow()
        await expect(parseThroughPlugin(body, contentType)).rejects.toThrow(TypeError)
      }

      expect(readdirSync(tmpDir)).toHaveLength(0)
    })

    it('decodes field values as UTF-8 regardless of the part charset, like the standard parser', async () => {
      const boundary = 'X-TEST-BOUNDARY'
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="field"\r\nContent-Type: text/plain; charset=latin1\r\n\r\n`),
        // 0xE9 is é in latin1 and an invalid sequence in UTF-8
        Buffer.from([0xE9]),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ])

      const contentType = `multipart/form-data; boundary=${boundary}`
      const expected = await new Response(body, { headers: { 'content-type': contentType } }).formData()

      const entries = await parseThroughPlugin(body, contentType)
      expect(entries).toEqual([{ kind: 'field', name: 'field', value: expected.get('field') }])
      expect(entries[0]).toMatchObject({ value: '�' })
    })

    it('keeps content-type parameters in file types, like the standard parser', async () => {
      const boundary = 'X-TEST-BOUNDARY'
      const body = Buffer.from([
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="data.csv"',
        'Content-Type: text/csv; charset=utf-8',
        '',
        'a,b',
        `--${boundary}--`,
        '',
      ].join('\r\n'))

      const contentType = `multipart/form-data; boundary=${boundary}`
      const expected = await new Response(body, { headers: { 'content-type': contentType } }).formData()

      const entries = await parseThroughPlugin(body, contentType)
      expect(entries).toMatchObject([{ kind: 'file', fileName: 'data.csv', type: (expected.get('file') as File).type }])
      expect(entries[0]).toMatchObject({ type: 'text/csv; charset=utf-8' })
    })

    it('leaves non-multipart bodies to the standard parser under a form-data hint', async () => {
      const plugin = new TmpFileUploadHandlerPlugin({ tmpDir })
      const interceptor = plugin.init({}).routingInterceptors![0]!

      const standardParsed = new FormData()
      standardParsed.append('parsed-by', 'the standard parser')

      const result = await interceptor({
        context: {},
        prefix: undefined,
        request: {
          method: 'POST',
          url: '/upload',
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '7' },
          resolveBody: async hint => hint === 'form-data' ? standardParsed : undefined,
        },
        next: async (nextOptions) => {
          expect(await nextOptions!.request.resolveBody('form-data')).toBe(standardParsed)
          return { matched: false }
        },
      })

      expect(result).toEqual({ matched: false })
      expect(readdirSync(tmpDir)).toHaveLength(0)
    })

    it('spools many small file parts without accumulating open file handles', async () => {
      // Only observable through the process fd table
      if (!existsSync('/proc/self/fd')) {
        return
      }

      const form = new FormData()
      for (let i = 0; i < 300; i++) {
        form.append(`file-${i}`, new File([`content-${i}`], `f-${i}.bin`, { type: 'application/octet-stream' }))
      }

      const response = new Response(form)
      const contentType = response.headers.get('content-type')!
      const body = Buffer.from(await response.arrayBuffer())

      const baseline = readdirSync('/proc/self/fd').length
      let maxFds = baseline

      const sampler = setInterval(() => {
        maxFds = Math.max(maxFds, readdirSync('/proc/self/fd').length)
      }, 1)

      try {
        // Contents stay unread: lazy reads would open descriptors of their own
        const plugin = new TmpFileUploadHandlerPlugin({ tmpDir })
        const interceptor = plugin.init({}).routingInterceptors![0]!

        await interceptor({
          context: {},
          prefix: undefined,
          request: {
            method: 'POST',
            url: '/upload',
            headers: { 'content-type': contentType },
            resolveBody: async () => toStream(body, 256, 'async'),
          },
          next: async (nextOptions) => {
            const parsed = await nextOptions!.request.resolveBody() as FormData
            expect([...parsed]).toHaveLength(300)
            return { matched: false }
          },
        })
      }
      finally {
        clearInterval(sampler)
      }

      // Disk work is serialized, so concurrent handles stay flat instead of one per part
      expect(maxFds - baseline).toBeLessThan(30)
    })
  })
})
