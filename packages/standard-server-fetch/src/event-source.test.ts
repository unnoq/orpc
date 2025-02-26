import { ErrorEvent, getEventMeta, isAsyncIteratorObject, UnknownEvent, withEventMeta } from '@orpc/standard-server'
import { toEventIterator, toEventStream } from './event-source'

describe('toEventIterator', () => {
  it('with done event', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: {"order": 1}\nid: id-1\nretry: 10000\n\n')
        controller.enqueue('event: message\ndata: {"order": 2}\nid: id-2\n\n')
        controller.enqueue('event: done\ndata: {"order": 3}\nid: id-3\nretry: 30000')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventIterator(stream)
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-1', retry: 10000 }))

      return true
    })

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 2 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-2', retry: undefined }))

      return true
    })

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(true)
      expect(value).toEqual({ order: 3 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-3', retry: 30000 }))

      return true
    })

    await expect(stream.getReader().closed).resolves.toBe(undefined)
  })

  it('without dont event', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: {"order": 1}\nid: id-1\nretry: 10000\n\n')
        controller.enqueue('event: message\ndata: {"order": 2}\nid: id-2\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventIterator(stream)
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-1', retry: 10000 }))

      return true
    })

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 2 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-2', retry: undefined }))

      return true
    })

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(true)
      expect(value).toEqual(undefined)
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    await expect(stream.getReader().closed).resolves.toBe(undefined)
  })

  it('with error event', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: {"order": 1}\nid: id-1\nretry: 10000\n\n')
        controller.enqueue('event: message\ndata: {"order": 2}\nid: id-2\n\n')
        controller.enqueue('event: error\ndata: {"order": 3}\nid: id-3\nretry: 30000')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventIterator(stream)
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-1', retry: 10000 }))

      return true
    })

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 2 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-2', retry: undefined }))

      return true
    })

    await expect(generator.next()).rejects.toSatisfy((error: any) => {
      expect(error).toBeInstanceOf(ErrorEvent)
      expect(error.data).toEqual({ order: 3 })
      expect(getEventMeta(error)).toEqual(expect.objectContaining({ id: 'id-3', retry: 30000 }))

      return true
    })

    await expect(stream.getReader().closed).resolves.toBe(undefined)
  })

  it('with unknown event', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: {"order": 1}\nid: id-1\nretry: 10000\n\n')
        controller.enqueue('event: message\ndata: {"order": 2}\nid: id-2\n\n')
        controller.enqueue('event: unknown\ndata: {"order": 3}\nid: id-3\nretry: 30000')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventIterator(stream)
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-1', retry: 10000 }))

      return true
    })

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 2 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-2', retry: undefined }))

      return true
    })

    await expect(generator.next()).rejects.toSatisfy((error: any) => {
      expect(error).toBeInstanceOf(UnknownEvent)
      expect(error.data).toEqual({ order: 3 })
      expect(getEventMeta(error)).toEqual(expect.objectContaining({ id: 'id-3', retry: 30000 }))

      return true
    })

    await expect(stream.getReader().closed).resolves.toBe(undefined)
  })

  it('when .return() before finish reading', async () => {
    const stream = new ReadableStream<string>({
      async pull(controller) {
        controller.enqueue('event: message\ndata: {"order": 1}\nid: id-1\nretry: 10000\n\n')
        controller.enqueue('event: message\ndata: {"order": 2}\nid: id-2\n\n')
        controller.enqueue('event: unknown\ndata: {"order": 3}\nid: id-3\nretry: 30000')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const generator = toEventIterator(stream)
    expect(generator).toSatisfy(isAsyncIteratorObject)

    expect(await generator.next()).toSatisfy(({ done, value }) => {
      expect(done).toEqual(false)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(expect.objectContaining({ id: 'id-1', retry: 10000 }))

      return true
    })

    await generator.return()

    await new Promise(r => setTimeout(r, 10))
    await expect(stream.getReader().closed).resolves.toBe(undefined)
  })
})

describe('toEventStream', () => {
  it('with return', async () => {
    async function* gen() {
      yield withEventMeta({ order: 1 }, { id: 'id-1' })
      yield withEventMeta({ order: 2 }, { retry: 20000 })
      yield undefined
      return withEventMeta({ order: 4 }, { id: 'id-4', retry: 40000 })
    }

    const reader = toEventStream(gen())
      .pipeThrough(new TextDecoderStream())
      .getReader()

    expect((await reader.read()).value).toEqual('event: message\nid: id-1\ndata: {"order":1}\n\n')
    expect((await reader.read()).value).toEqual('event: message\nretry: 20000\ndata: {"order":2}\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: \n\n')
    expect((await reader.read()).value).toEqual('event: done\nretry: 40000\nid: id-4\ndata: {"order":4}\n\n')
    expect((await reader.read()).done).toEqual(true)
  })

  it('with normal error', async () => {
    async function* gen() {
      yield withEventMeta({ order: 1 }, { id: 'id-1' })
      yield withEventMeta({ order: 2 }, { retry: 20000 })
      yield undefined
      throw withEventMeta(new Error('order-4'), { id: 'id-4', retry: 40000 })
    }

    const reader = toEventStream(gen())
      .pipeThrough(new TextDecoderStream())
      .getReader()

    expect((await reader.read()).value).toEqual('event: message\nid: id-1\ndata: {"order":1}\n\n')
    expect((await reader.read()).value).toEqual('event: message\nretry: 20000\ndata: {"order":2}\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: \n\n')
    expect((await reader.read()).value).toEqual('event: error\nretry: 40000\nid: id-4\ndata: \n\n')
    expect((await reader.read()).done).toEqual(true)
  })

  it('with ErrorEvent error', async () => {
    async function* gen() {
      yield withEventMeta({ order: 1 }, { id: 'id-1' })
      yield withEventMeta({ order: 2 }, { retry: 20000 })
      yield undefined
      throw withEventMeta(new ErrorEvent({ data: { order: 4 } }), { id: 'id-4', retry: 40000 })
    }

    const reader = toEventStream(gen())
      .pipeThrough(new TextDecoderStream())
      .getReader()

    expect((await reader.read()).value).toEqual('event: message\nid: id-1\ndata: {"order":1}\n\n')
    expect((await reader.read()).value).toEqual('event: message\nretry: 20000\ndata: {"order":2}\n\n')
    expect((await reader.read()).value).toEqual('event: message\ndata: \n\n')
    expect((await reader.read()).value).toEqual('event: error\nretry: 40000\nid: id-4\ndata: {"order":4}\n\n')
    expect((await reader.read()).done).toEqual(true)
  })

  it('when canceled from client without region', async () => {
    let hasError: any
    let hasFinally = false

    async function* gen() {
      try {
        yield 1
        yield undefined
        return { value: true }
      }
      catch (err) {
        hasError = err
      }
      finally {
        hasFinally = true
      }
    }

    const stream = toEventStream(gen())

    const reader = stream.getReader()
    await reader.read()
    await reader.cancel()

    await vi.waitFor(() => {
      expect(hasError).toBe(undefined)
      expect(hasFinally).toBe(true)
    })
  })

  it('when canceled from client with region', async () => {
    let hasError: any
    let hasFinally = false

    async function* gen() {
      try {
        yield 1
        yield undefined
        return { value: true }
      }
      catch (err) {
        hasError = err
      }
      finally {
        hasFinally = true
      }
    }

    const stream = toEventStream(gen())

    const reason = new Error('reason')
    const reader = stream.getReader()
    await reader.read()
    await reader.cancel(reason)

    await vi.waitFor(() => {
      expect(hasError).toBe(reason)
      expect(hasFinally).toBe(true)
    })
  })
})
