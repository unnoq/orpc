import type {
  StandardEventSourceOptions,
} from '@orpc/standard-server'
import { isTypescriptObject, parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import {
  encodeEventMessage,
  ErrorEvent,
  EventDecoderStream,
  getEventMeta,
  withEventMeta,
} from '@orpc/standard-server'

export function toEventIterator(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown | void, unknown | void, void> {
  const eventStream = stream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventDecoderStream())

  const reader = eventStream.getReader()

  async function* gen() {
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          return
        }

        switch (value.event) {
          case 'message': {
            let message = parseEmptyableJSON(value.data)

            if (isTypescriptObject(message)) {
              message = withEventMeta(message, value)
            }

            yield message
            break
          }

          case 'error': {
            let error = new ErrorEvent({
              data: parseEmptyableJSON(value.data),
            })

            error = withEventMeta(error, value)

            throw error
          }

          case 'done': {
            let done = parseEmptyableJSON(value.data)

            if (isTypescriptObject(done)) {
              done = withEventMeta(done, value)
            }

            return done
          }
        }
      }
    }
    finally {
      await reader.cancel()
    }
  }

  return gen()
}

export function toEventStream(
  iterator: AsyncIterator<unknown | void, unknown | void, void>,
  options: StandardEventSourceOptions,
): ReadableStream<Uint8Array> {
  const pingEnabled = options.eventSourcePingEnabled ?? true
  const pingInterval = options.eventSourcePingInterval ?? 5_000
  const pingContent = options.eventSourcePingContent ?? ''

  let timeout: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream<string>({
    async pull(controller) {
      try {
        if (pingEnabled) {
          timeout = setInterval(() => {
            controller.enqueue(encodeEventMessage({
              comments: [pingContent],
            }))
          }, pingInterval)
        }

        const value = await iterator.next()

        clearInterval(timeout)

        controller.enqueue(encodeEventMessage({
          ...getEventMeta(value.value),
          event: value.done ? 'done' : 'message',
          data: stringifyJSON(value.value),
        }))

        if (value.done) {
          controller.close()
        }
      }
      catch (err) {
        controller.enqueue(encodeEventMessage({
          ...getEventMeta(err),
          event: 'error',
          data: err instanceof ErrorEvent ? stringifyJSON(err.data) : undefined,
        }))

        controller.close()
      }
    },
    async cancel(reason) {
      if (reason) {
        await iterator.throw?.(reason)
      }
      else {
        await iterator.return?.()
      }
    },
  }).pipeThrough(new TextEncoderStream())

  return stream
}
