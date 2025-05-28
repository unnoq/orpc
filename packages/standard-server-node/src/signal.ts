import type Stream from 'node:stream'

export function toAbortSignal(stream: Stream.Writable): AbortSignal {
  const controller = new AbortController()

  stream.once('error', error => controller.abort(error))

  stream.once('close', () => {
    if (!stream.writableFinished) {
      controller.abort(new Error('Writable stream closed before it finished writing'))
    }
  })

  return controller.signal
}
