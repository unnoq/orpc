import type { AnyRouter } from '@orpc/server'
import type { FetchHandlerPlugin } from '@orpc/server/fetch'
import type { BatchResponseCompressionHandlerPluginOptions } from './batch-response-compression-handler-plugin'
import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { BATCH_CONTENT_TYPE, BatchHandlerPlugin, ResponseCompressionHandlerPlugin } from '@orpc/server/plugins'
import { promiseWithResolvers } from '@orpc/shared'
import { BatchResponseCompressionHandlerPlugin } from './batch-response-compression-handler-plugin'

// Long enough that a compressed body is unmistakably smaller than the identity one
const largeValue = 'batched-payload-'.repeat(64)

function makePeerRequestMessage(id: number, url: string) {
  return {
    kind: 'request',
    id,
    json: { method: 'POST', url, headers: {}, body: undefined },
    binary: undefined,
  }
}

function createBatchRequest(
  mode: 'buffered' | 'streaming',
  messages: unknown[],
  headers: Record<string, string> = { 'accept-encoding': 'gzip' },
) {
  return new Request('https://example.com/__batch__', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json', 'orpc-batch': mode },
    body: JSON.stringify(messages),
  })
}

async function decompress(response: Response, encoding: 'gzip' | 'deflate' | 'deflate-raw'): Promise<string> {
  return new Response(response.body!.pipeThrough(new DecompressionStream(encoding))).text()
}

describe('batchResponseCompressionHandlerPlugin', () => {
  const router = {
    ping: os.handler(() => largeValue),
    blob: os.handler(() => new Blob([largeValue], { type: 'application/octet-stream' })),
  }

  function createHandler(
    options: BatchResponseCompressionHandlerPluginOptions = {},
    { router: handlerRouter = router as AnyRouter, plugins = [] }: {
      router?: AnyRouter
      plugins?: FetchHandlerPlugin<any>[]
    } = {},
  ) {
    return new RPCHandler(handlerRouter, {
      plugins: [
        new BatchHandlerPlugin(),
        new BatchResponseCompressionHandlerPlugin(options),
        ...plugins,
      ],
    })
  }

  it('compresses streaming batch responses', async () => {
    const handler = createHandler()

    const { matched, response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
      makePeerRequestMessage(1, '/ping'),
    ]))

    expect(matched).toBe(true)
    expect(response!.status).toBe(207)
    expect(response!.headers.get('content-encoding')).toBe('gzip')
    expect(response!.headers.get('content-type')).toBe('application/vnd.orpc.batch')
    // A shared cache must key on the encoding, or it hands this body to a client that cannot decode it
    expect(response!.headers.get('vary')).toBe('accept-encoding')
    // Without the hint a proxy-added content-length would make the client buffer the whole batch
    expect(response!.headers.get('standard-server')).toBe('octet-stream')
    expect(response!.headers.get('content-length')).toBe(null)

    await expect(decompress(response!, 'gzip')).resolves.toContain(largeValue)
  })

  /**
   * The reason this plugin exists: `CompressionStream` cannot flush, so every message of a
   * streaming batch would sit in the compressor until the slowest subrequest resolved.
   */
  it('delivers each message as soon as it is produced, without waiting for the whole batch', async () => {
    const slow = promiseWithResolvers<string>()

    const handler = createHandler({}, {
      router: {
        fast: os.handler(() => largeValue),
        slow: os.handler(() => slow.promise),
      },
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/fast'),
      makePeerRequestMessage(1, '/slow'),
    ]))

    expect(response!.headers.get('content-encoding')).toBe('gzip')

    const reader = response!.body!.pipeThrough(new DecompressionStream('gzip')).getReader()
    const decoder = new TextDecoder()
    let received = ''

    while (!received.includes(largeValue)) {
      const { done, value } = await reader.read()
      // A buffering compressor ends the stream (or stalls) before the fast message arrives
      expect(done).toBe(false)
      received += decoder.decode(value, { stream: true })
    }

    slow.resolve('slow-result')

    while (!received.includes('slow-result')) {
      const { done, value } = await reader.read()
      expect(done).toBe(false)
      received += decoder.decode(value, { stream: true })
    }
  })

  it('compresses buffered batch responses that carry binary subresponses', async () => {
    const handler = createHandler()

    const { response } = await handler.handle(createBatchRequest('buffered', [
      makePeerRequestMessage(0, '/blob'),
      makePeerRequestMessage(1, '/ping'),
    ]))

    expect(response!.status).toBe(207)
    expect(response!.headers.get('content-encoding')).toBe('gzip')
    expect(response!.headers.get('content-type')).toBe('application/vnd.orpc.batch')
    expect(response!.headers.get('content-length')).toBe(null)
    // The blob is gone, so the client must be told the body is a stream rather than a file
    expect(response!.headers.get('standard-server')).toBe('octet-stream')
    expect(response!.headers.get('content-disposition')).toBe(null)

    await expect(decompress(response!, 'gzip')).resolves.toContain(largeValue)
  })

  it('leaves a buffered batch below the threshold alone', async () => {
    const handler = createHandler({ threshold: 10 * 1024 })

    const { response } = await handler.handle(createBatchRequest('buffered', [
      makePeerRequestMessage(0, '/blob'),
    ]))

    expect(response!.headers.get('content-encoding')).toBe(null)
    await expect(response!.text()).resolves.toContain(largeValue)
  })

  /**
   * A json-only buffered batch is a plain array of messages rather than a framed body, and it is
   * still a batch response, so this plugin compresses it as json instead of leaving it behind.
   */
  it('compresses json-only buffered batch responses', async () => {
    const handler = createHandler()

    const { response } = await handler.handle(createBatchRequest('buffered', [
      makePeerRequestMessage(0, '/ping'),
      makePeerRequestMessage(1, '/ping'),
    ]))

    expect(response!.status).toBe(207)
    expect(response!.headers.get('content-encoding')).toBe('gzip')
    // The client still has to parse json, so the body keeps the type and hint that says so
    expect(response!.headers.get('content-type')).toBe('application/json')
    expect(response!.headers.get('standard-server')).toBe(null)
    expect(response!.headers.get('content-length')).toBe(null)
    expect(response!.headers.get('vary')).toBe('accept-encoding')

    const decoded: unknown = JSON.parse(await decompress(response!, 'gzip'))
    expect(decoded).toHaveLength(2)
    expect(JSON.stringify(decoded)).toContain(largeValue)
  })

  it('leaves a json-only buffered batch below the threshold alone', async () => {
    const handler = createHandler({ threshold: 10 * 1024 }, {
      router: { tiny: os.handler(() => 'ok') },
    })

    const { response } = await handler.handle(createBatchRequest('buffered', [
      makePeerRequestMessage(0, '/tiny'),
    ]))

    expect(response!.headers.get('content-encoding')).toBe(null)
    expect(response!.headers.get('content-type')).toContain('application/json')
  })

  /**
   * Reachable when a client batches but the server forgot the batch plugin, where an ordinary array
   * response reaches this plugin. It is compressed as the json the adapter would have sent anyway,
   * so whatever the array holds has to survive the round trip.
   */
  it('compresses an array response that holds something other than messages', async () => {
    const handler = new RPCHandler(router, {
      plugins: [new BatchResponseCompressionHandlerPlugin({ threshold: 0 })],
      routingInterceptors: [async () => ({
        matched: true,
        response: { status: 200, headers: {}, body: [null, undefined, largeValue] },
      })],
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
    ]))

    expect(response!.status).toBe(200)
    expect(response!.headers.get('content-encoding')).toBe('gzip')
    expect(response!.headers.get('content-type')).toBe('application/json')
    // `undefined` becomes `null` in a json array, exactly as the adapter would have serialized it
    expect(JSON.parse(await decompress(response!, 'gzip'))).toEqual([null, null, largeValue])
  })

  /**
   * A batch that fails as a whole answers with a plain message rather than subresponses.
   */
  it('leaves a failed batch response alone', async () => {
    const handler = createHandler()

    const { response } = await handler.handle(new Request('https://example.com/__batch__', {
      method: 'POST',
      headers: { 'accept-encoding': 'gzip', 'content-type': 'application/json', 'orpc-batch': 'streaming' },
      body: JSON.stringify({ not: 'an array of messages' }),
    }))

    expect(response!.status).toBe(400)
    expect(response!.headers.get('content-encoding')).toBe(null)
  })

  it('leaves responses that are not batch responses alone', async () => {
    const handler = createHandler()

    const { response } = await handler.handle(new Request('https://example.com/ping', {
      method: 'POST',
      headers: { 'accept-encoding': 'gzip' },
    }))

    expect(response!.status).toBe(200)
    expect(response!.headers.get('content-encoding')).toBe(null)
    await expect(response!.text()).resolves.toContain(largeValue)
  })

  /**
   * Only a request that asked for a batch can produce one, so a procedure serving the batch
   * content type itself keeps the file semantics it would have without this plugin.
   */
  it('leaves a file that merely carries the batch content type alone', async () => {
    const handler = createHandler({}, {
      router: {
        export: os.handler(() => new File([largeValue], 'export.batch', { type: BATCH_CONTENT_TYPE })),
      },
    })

    const { response } = await handler.handle(new Request('https://example.com/export', {
      method: 'POST',
      headers: { 'accept-encoding': 'gzip' },
    }))

    expect(response!.headers.get('content-encoding')).toBe(null)
    expect(response!.headers.get('content-type')).toBe(BATCH_CONTENT_TYPE)
    expect(response!.headers.get('content-disposition')).toContain('export.batch')
    await expect(response!.text()).resolves.toBe(largeValue)
  })

  /**
   * Reachable without the batch plugin registered, where a range request carrying the batch header
   * is answered by whatever else serves that content type.
   */
  it('leaves a partial response alone, whose content-range would stop describing the body', async () => {
    const handler = new RPCHandler(router, {
      plugins: [new BatchResponseCompressionHandlerPlugin({ threshold: 0 })],
      routingInterceptors: [async () => ({
        matched: true,
        response: {
          status: 206,
          headers: {
            'content-type': BATCH_CONTENT_TYPE,
            'content-range': `bytes 0-${largeValue.length - 1}/${largeValue.length * 2}`,
          },
          body: new Blob([largeValue], { type: BATCH_CONTENT_TYPE }),
        },
      })],
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
    ]))

    expect(response!.status).toBe(206)
    expect(response!.headers.get('content-encoding')).toBe(null)
    expect(response!.headers.get('content-range')).toBe(`bytes 0-${largeValue.length - 1}/${largeValue.length * 2}`)
    await expect(response!.text()).resolves.toBe(largeValue)
  })

  describe('encoding negotiation', () => {
    it.each([
      ['gzip', 'gzip'],
      ['deflate', 'deflate'],
      ['deflate-raw', 'deflate-raw'],
    ] as const)('compresses with %s when the client accepts it', async (accepted, expected) => {
      const handler = createHandler({ encodings: ['gzip', 'deflate', 'deflate-raw'] })

      const { response } = await handler.handle(createBatchRequest(
        'streaming',
        [makePeerRequestMessage(0, '/ping')],
        { 'accept-encoding': accepted },
      ))

      expect(response!.headers.get('content-encoding')).toBe(expected)
      await expect(decompress(response!, expected)).resolves.toContain(largeValue)
    })

    it('prefers the first configured encoding the client accepts', async () => {
      const handler = createHandler({ encodings: ['deflate', 'gzip'] })

      const { response } = await handler.handle(createBatchRequest(
        'streaming',
        [makePeerRequestMessage(0, '/ping')],
        { 'accept-encoding': 'gzip, deflate' },
      ))

      expect(response!.headers.get('content-encoding')).toBe('deflate')
    })

    it('does not compress when the client accepts no configured encoding', async () => {
      const handler = createHandler()

      const { response } = await handler.handle(createBatchRequest(
        'streaming',
        [makePeerRequestMessage(0, '/ping')],
        { 'accept-encoding': 'br' },
      ))

      expect(response!.headers.get('content-encoding')).toBe(null)
      await expect(response!.text()).resolves.toContain(largeValue)
    })

    it('honours a coding the client explicitly rejects', async () => {
      const handler = createHandler()

      const { response } = await handler.handle(createBatchRequest(
        'streaming',
        [makePeerRequestMessage(0, '/ping')],
        { 'accept-encoding': 'gzip;q=0, deflate;q=0' },
      ))

      expect(response!.headers.get('content-encoding')).toBe(null)
    })

    it('does not compress when the client sends no accept-encoding', async () => {
      const handler = createHandler()

      const { response } = await handler.handle(createBatchRequest('streaming', [
        makePeerRequestMessage(0, '/ping'),
      ], {}))

      expect(response!.headers.get('content-encoding')).toBe(null)
    })
  })

  it('appends to an existing vary header instead of replacing it', async () => {
    const handler = new RPCHandler(router, {
      plugins: [
        new BatchHandlerPlugin({ headers: { vary: 'origin' } }),
        new BatchResponseCompressionHandlerPlugin(),
      ],
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
    ]))

    expect(response!.headers.get('vary')).toBe('origin, accept-encoding')
  })

  it('does not compress a body that is already encoded', async () => {
    const handler = new RPCHandler(router, {
      plugins: [
        new BatchHandlerPlugin(),
        // Runs first, so the batch response reaches this plugin already compressed
        new BatchResponseCompressionHandlerPlugin(),
        new BatchResponseCompressionHandlerPlugin(),
      ],
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
    ]))

    expect(response!.headers.get('content-encoding')).toBe('gzip')
    await expect(decompress(response!, 'gzip')).resolves.toContain(largeValue)
  })

  it('does not transform a body whose cache-control forbids it', async () => {
    const handler = new RPCHandler(router, {
      plugins: [
        new BatchHandlerPlugin({ headers: { 'cache-control': 'public, no-transform' } }),
        new BatchResponseCompressionHandlerPlugin(),
      ],
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
    ]))

    expect(response!.headers.get('content-encoding')).toBe(null)
    await expect(response!.text()).resolves.toContain(largeValue)
  })

  // Neither plugin constrains the other's order, so registration order decides which runs first
  it.each([
    ['batch compression first', () => [new BatchResponseCompressionHandlerPlugin(), new ResponseCompressionHandlerPlugin({ threshold: 0 })]],
    ['response compression first', () => [new ResponseCompressionHandlerPlugin({ threshold: 0 }), new BatchResponseCompressionHandlerPlugin()]],
  ] as const)('coexists with the response compression plugin, %s, without compressing twice', async (_name, createPlugins) => {
    const handler = new RPCHandler(router, {
      plugins: [new BatchHandlerPlugin(), ...createPlugins()],
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/ping'),
    ]))

    expect(response!.headers.get('content-encoding')).toBe('gzip')
    expect(response!.headers.get('vary')).toBe('accept-encoding')
    await expect(decompress(response!, 'gzip')).resolves.toContain(largeValue)
  })

  it('stops a batch cleanly through the compressor when the client cancels mid-stream', async () => {
    const never = promiseWithResolvers<string>()

    const handler = createHandler({}, {
      router: {
        fast: os.handler(() => largeValue),
        never: os.handler(({ signal }) => new Promise<string>((_, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason))
          void never.promise
        })),
      },
    })

    const { response } = await handler.handle(createBatchRequest('streaming', [
      makePeerRequestMessage(0, '/fast'),
      makePeerRequestMessage(1, '/never'),
    ]))

    const reader = response!.body!.getReader()
    const { value } = await reader.read()
    expect(value!.byteLength).toBeGreaterThan(0)

    await expect(reader.cancel()).resolves.toBeUndefined()
  })
})
