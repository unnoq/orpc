import Stream from 'node:stream'
import { AbortError } from '@orpc/shared'
import { toAbortSignal } from './signal'

describe('toAbortSignal', async () => {
  it('on success', async () => {
    const stream = new Stream.Writable({
      write(chunk, encoding, callback) {
        callback()
      },
    })

    const signal = toAbortSignal(stream)

    expect(signal.aborted).toBe(false)

    stream.end('test')

    await new Promise(r => setTimeout(r, 100))

    expect(signal.aborted).toBe(false)
  })

  it('on error', async () => {
    const stream = new Stream.Writable({
      write(chunk, encoding, callback) {
        callback()
      },
    })

    // catch error
    stream.on('error', () => {})

    const signal = toAbortSignal(stream)

    expect(signal.aborted).toBe(false)

    stream.destroy(new Error('test'))

    await vi.waitFor(() => {
      expect(signal.aborted).toEqual(true)
      expect(signal.reason).toEqual(new Error('test'))
    })
  })

  it('on writableFinished=false', async () => {
    const stream = new Stream.Writable({
      write(chunk, encoding, callback) {
      },
    })

    const signal = toAbortSignal(stream)

    expect(signal.aborted).toBe(false)

    stream.write('test')
    stream.destroy()

    await vi.waitFor(() => {
      expect(signal.aborted).toEqual(true)
      expect(signal.reason).toEqual(new AbortError('Writable stream closed before it finished writing'))
    })
  })
})
