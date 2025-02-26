import type { JsonValue } from '@orpc/standard-server'
import {
  encodeEventMessage,
  ErrorEvent,
  EventDecoderStream,
  getEventMeta,
  isEventMetaContainer,
  parseEmptyableJSON,
  UnknownEvent,
  withEventMeta,
} from '@orpc/standard-server'

export function toEventIterator(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<JsonValue | void, JsonValue | void, void> {
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

            if (isEventMetaContainer(message)) {
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

            if (isEventMetaContainer(done)) {
              done = withEventMeta(done, value)
            }

            return done
          }

          default: {
            let error = new UnknownEvent({
              message: `Unknown event: ${value.event}`,
              data: parseEmptyableJSON(value.data),
            })

            error = withEventMeta(error, value)

            throw error
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
  iterator: AsyncIterator<JsonValue | void, JsonValue | void, void>,
): ReadableStream<Uint8Array> {
  const stream = new ReadableStream<string>({
    async pull(controller) {
      try {
        const value = await iterator.next()

        controller.enqueue(encodeEventMessage({
          ...getEventMeta(value.value),
          event: value.done ? 'done' : 'message',
          data: JSON.stringify(value.value),
        }))

        if (value.done) {
          controller.close()
        }
      }
      catch (err) {
        controller.enqueue(encodeEventMessage({
          ...getEventMeta(err),
          event: 'error',
          data: err instanceof ErrorEvent ? JSON.stringify(err.data) : undefined,
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
