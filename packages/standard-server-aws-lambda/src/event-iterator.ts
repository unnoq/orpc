import type { ToEventIteratorOptions as BaseToEventIteratorOptions } from '@orpc/standard-server-fetch'
import { toEventIterator as baseToEventIterator } from '@orpc/standard-server-fetch'

export interface ToEventIteratorOptions extends BaseToEventIteratorOptions {}

export function toEventIterator(
  body: string | undefined,
  options: ToEventIteratorOptions = {},
): AsyncIteratorObject<unknown | void, unknown | void, void> & AsyncGenerator<unknown | void, unknown | void, void> {
  if (body === undefined) {
    return baseToEventIterator(null, options)
  }

  return baseToEventIterator(
    new ReadableStream<string>({
      pull(controller) {
        controller.enqueue(body)
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream()),
    options,
  )
}
