import type { AnyRouter } from '@orpc/server'
import type { IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Buffer } from 'node:buffer'
import { createServer, request as httpRequest } from 'node:http'
import { createGunzip } from 'node:zlib'
import { os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/node'
import { BatchHandlerPlugin } from '@orpc/server/plugins'
import { promiseWithResolvers } from '@orpc/shared'
import { BatchResponseCompressionHandlerPlugin } from '../src'

const largeValue = 'batched-payload-'.repeat(64)

function makePeerRequestMessage(id: number, url: string) {
  return {
    kind: 'request',
    id,
    json: { method: 'POST', url, headers: {}, body: undefined },
    binary: undefined,
  }
}

/**
 * Driven over a raw socket rather than `fetch`, which decompresses transparently and buffers
 * enough to hide both the bytes on the wire and the moment each one reaches the client.
 */
function startBatchServer(
  router: AnyRouter,
  keepAlive?: { enabled: boolean, interval?: number },
) {
  const handler = new RPCHandler(router, {
    plugins: [
      new BatchHandlerPlugin({ keepAlive }),
      new BatchResponseCompressionHandlerPlugin({ threshold: 0 }),
    ],
  })

  const server = createServer(async (req, res) => {
    const result = await handler.handle(req, res, { context: {} })

    if (!result.matched) {
      res.statusCode = 404
      res.end('not matched')
    }
  })

  return server
}

function sendBatchRequest(port: number, messages: unknown[], headers: Record<string, string> = { 'accept-encoding': 'gzip' }) {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const req = httpRequest({
      host: '127.0.0.1',
      port,
      path: '/__batch__',
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'orpc-batch': 'streaming' },
    }, resolve)

    req.on('error', reject)
    req.end(JSON.stringify(messages))
  })
}

it('sends each batch message compressed as soon as it is produced', async ({ onTestFinished }) => {
  const slow = promiseWithResolvers<string>()

  const server = startBatchServer({
    fast: os.handler(() => largeValue),
    slow: os.handler(() => slow.promise),
  })
  onTestFinished(() => {
    server.close()
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  const res = await sendBatchRequest(port, [
    makePeerRequestMessage(0, '/fast'),
    makePeerRequestMessage(1, '/slow'),
  ])

  expect(res.statusCode).toBe(207)
  expect(res.headers['content-encoding']).toBe('gzip')
  expect(res.headers['content-type']).toBe('application/vnd.orpc.batch')
  // A shared cache must key on the encoding, or it hands this body to a client that cannot decode it
  expect(res.headers.vary).toBe('accept-encoding')
  expect(res.headers['content-length']).toBeUndefined()

  const wire: Buffer[] = []
  const gunzip = createGunzip()
  let decoded = ''
  gunzip.on('data', (chunk: Buffer) => {
    decoded += chunk.toString()
  })

  const ended = new Promise<void>(resolve => res.on('end', resolve))
  res.on('data', (chunk: Buffer) => {
    wire.push(chunk)
    gunzip.write(chunk)
  })

  // The compressor flushed the fast message instead of holding it until the batch ends
  await vi.waitFor(() => expect(decoded).toContain(largeValue))
  expect(Buffer.concat(wire).subarray(0, 2)).toEqual(Buffer.from([0x1F, 0x8B])) // gzip magic
  expect(Buffer.concat(wire).byteLength).toBeLessThan(largeValue.length / 2)

  slow.resolve('slow-result')

  await vi.waitFor(() => expect(decoded).toContain('slow-result'))
  await ended
  gunzip.end()
})

it('keeps flushing keep-alive frames while the batch is idle', async ({ onTestFinished }) => {
  const pending = promiseWithResolvers<string>()

  const server = startBatchServer(
    { pending: os.handler(() => pending.promise) },
    { enabled: true, interval: 20 },
  )
  onTestFinished(() => {
    pending.resolve('done')
    server.close()
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  const res = await sendBatchRequest(port, [makePeerRequestMessage(0, '/pending')])

  expect(res.headers['content-encoding']).toBe('gzip')

  const KEEP_ALIVE_FRAME_SIZE = 4 // a zero-length length-prefixed frame

  let decompressedBytes = 0
  const gunzip = createGunzip()
  gunzip.on('data', (chunk: Buffer) => {
    decompressedBytes += chunk.byteLength
  })
  res.on('data', (chunk: Buffer) => gunzip.write(chunk))

  /**
   * Keep-alive frames exist to hold the connection open while no subrequest has resolved.
   * A compressor that buffered them would let the very connection they protect time out.
   */
  await vi.waitFor(
    () => expect(decompressedBytes).toBeGreaterThanOrEqual(2 * KEEP_ALIVE_FRAME_SIZE),
    { timeout: 2000 },
  )
})

it('leaves the batch response alone when the client accepts no supported encoding', async ({ onTestFinished }) => {
  const server = startBatchServer({ ping: os.handler(() => largeValue) })
  onTestFinished(() => {
    server.close()
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  const res = await sendBatchRequest(port, [makePeerRequestMessage(0, '/ping')], { 'accept-encoding': 'br' })

  expect(res.headers['content-encoding']).toBeUndefined()

  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  await new Promise<void>(resolve => res.on('end', resolve))

  expect(Buffer.concat(chunks).toString()).toContain(largeValue)
})
