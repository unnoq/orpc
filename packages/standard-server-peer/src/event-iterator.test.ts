import type { EventIteratorPayload } from './codec'
import * as shared from '@orpc/shared'
import { ErrorEvent, getEventMeta, withEventMeta } from '@orpc/standard-server'
import { resolveEventIterator, toEventIterator } from './event-iterator'

const AsyncIdQueue = shared.AsyncIdQueue
const startSpanSpy = vi.spyOn(shared, 'startSpan')
const runInSpanContextSpy = vi.spyOn(shared, 'runInSpanContext')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toEventIterator', () => {
  it('on success', async () => {
    const queue = new AsyncIdQueue<EventIteratorPayload>()

    queue.open('198')
    queue.open('199')

    queue.push('198', {
      event: 'message',
      data: 'hello',
    })

    queue.push('199', {
      event: 'message',
      data: 'hello2',
    })

    queue.push('198', {
      event: 'message',
      data: { hello3: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    queue.push('198', {
      event: 'done',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })

    const cleanup = vi.fn()
    const iterator = toEventIterator(queue, '198', cleanup)

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual('hello')
      expect(getEventMeta(value.value)).toEqual(undefined)

      return true
    })

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual({ hello3: true })
      expect(getEventMeta(value.value)).toEqual({ id: 'id-1', retry: 2000, comments: [] })
      return true
    })

    expect(cleanup).toHaveBeenCalledTimes(0)

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(true)
      expect(value.value).toEqual({ hello4: true })
      expect(getEventMeta(value.value)).toEqual({ id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      return true
    })

    expect(cleanup).toHaveBeenCalledTimes(1)

    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })

    expect(startSpanSpy).toHaveBeenCalledTimes(1)
    expect(runInSpanContextSpy).toHaveBeenCalledTimes(4)
  })

  it('on error', async () => {
    const queue = new AsyncIdQueue<EventIteratorPayload>()

    queue.open('198')
    queue.open('199')

    queue.push('198', {
      event: 'message',
      data: 'hello',
    })

    queue.push('199', {
      event: 'message',
      data: 'hello2',
    })

    queue.push('198', {
      event: 'message',
      data: { hello3: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    queue.push('198', {
      event: 'error',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })

    const cleanup = vi.fn()
    const iterator = toEventIterator(queue, '198', cleanup)

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual('hello')
      expect(getEventMeta(value.value)).toEqual(undefined)

      return true
    })

    await expect(iterator.next()).resolves.toSatisfy((value) => {
      expect(value.done).toBe(false)
      expect(value.value).toEqual({ hello3: true })
      expect(getEventMeta(value.value)).toEqual({ id: 'id-1', retry: 2000, comments: [] })
      return true
    })

    expect(cleanup).toHaveBeenCalledTimes(0)

    await expect(iterator.next()).rejects.toSatisfy((value) => {
      expect(value).toBeInstanceOf(ErrorEvent)
      expect(value.data).toEqual({ hello4: true })
      expect(getEventMeta(value)).toEqual({ id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      return true
    })

    expect(cleanup).toHaveBeenCalledTimes(1)

    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })

    expect(startSpanSpy).toHaveBeenCalledTimes(1)
    expect(runInSpanContextSpy).toHaveBeenCalledTimes(4)
  })

  it('on queue close before finish', async () => {
    const queue = new AsyncIdQueue<EventIteratorPayload>()
    queue.open('198')
    const cleanup = vi.fn()
    const iterator = toEventIterator(queue, '198', cleanup)

    const promise = expect(iterator.next()).rejects.toThrow('[AsyncIdQueue] Queue[198] was closed or aborted while waiting for pulling.')

    await new Promise(resolve => setTimeout(resolve, 1))
    queue.close({ id: '198' })
    await promise

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('on cleanup error', async () => {
    const queue = new AsyncIdQueue<EventIteratorPayload>()
    queue.open('198')

    const cleanupError = new Error('cleanup error')
    const cleanup = vi.fn(() => {
      throw cleanupError
    })

    const iterator = toEventIterator(queue, '198', cleanup)

    await expect(iterator.return()).rejects.toThrow(cleanupError)

    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})

describe('resolveEventIterator', () => {
  it('on success', async () => {
    const callback = vi.fn(async () => 'next' as const)

    await resolveEventIterator((async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
    })(), callback)

    expect(callback).toHaveBeenCalledTimes(4)
    expect(callback).toHaveBeenNthCalledWith(1, {
      event: 'message',
      data: 'hello',
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(callback).toHaveBeenNthCalledWith(3, {
      event: 'message',
      data: 'hello3',
    })

    expect(callback).toHaveBeenNthCalledWith(4, {
      event: 'done',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })
  })

  it('on ErrorEvent', async () => {
    const callback = vi.fn(async () => 'next' as const)

    await resolveEventIterator((async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      throw withEventMeta(new ErrorEvent({ data: { hello4: true } }), { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
    })(), callback)

    expect(callback).toHaveBeenCalledTimes(4)
    expect(callback).toHaveBeenNthCalledWith(1, {
      event: 'message',
      data: 'hello',
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(callback).toHaveBeenNthCalledWith(3, {
      event: 'message',
      data: 'hello3',
    })

    expect(callback).toHaveBeenNthCalledWith(4, {
      event: 'error',
      data: { hello4: true },
      meta: { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] },
    })
  })

  it('on non-ErrorEvent', async () => {
    const callback = vi.fn(async () => 'next' as const)

    await expect(resolveEventIterator((async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      throw new Error('test')
    })(), callback)).rejects.toThrow('test')

    expect(callback).toHaveBeenCalledTimes(4)
    expect(callback).toHaveBeenNthCalledWith(1, {
      event: 'message',
      data: 'hello',
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(callback).toHaveBeenNthCalledWith(3, {
      event: 'message',
      data: 'hello3',
    })

    /**
     * always emit an error event
     * even if the error is not an ErrorEvent
     * so that the iterator can be closed properly
     */
    expect(callback).toHaveBeenNthCalledWith(4, {
      event: 'error',
      data: undefined,
    })
  })

  it('on callback return abort', async () => {
    let time = 0
    const callback = vi.fn(async (...args) => {
      return time++ === 1 ? 'abort' : 'next' as const
    })

    let cleanupError
    let isCleanupCalled = false

    await resolveEventIterator((async function* () {
      try {
        yield 'hello'
        yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
        yield 'hello3'
        return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      }
      catch (err) {
        cleanupError = err
        throw err
      }
      finally {
        isCleanupCalled = true
      }
    })(), callback)

    expect(cleanupError).toBe(undefined)
    expect(isCleanupCalled).toBe(true)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, {
      event: 'message',
      data: 'hello',
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })
  })

  it('on callback throw error', async () => {
    const callbackError = new Error('callback error')

    let time = 0
    const callback = vi.fn(async () => {
      if (time++ === 1) {
        throw callbackError
      }

      return 'next' as const
    })

    let cleanupError
    let isCleanupCalled = false

    await expect(resolveEventIterator((async function* () {
      try {
        yield 'hello'
        yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
        yield 'hello3'
        return withEventMeta({ hello4: true }, { id: 'id-2', retry: 2001, comments: ['comment1', 'comment2'] })
      }
      catch (err) {
        cleanupError = err
        throw err
      }
      finally {
        isCleanupCalled = true
      }
    })(), callback)).rejects.toThrow('callback error')

    expect(cleanupError).toBe(undefined)
    expect(isCleanupCalled).toBe(true)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, {
      event: 'message',
      data: 'hello',
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })
  })

  it('on non-ErrorEvent and callback throw error', async () => {
    let time = 0
    const callback = vi.fn(async () => {
      if (++time === 4) {
        throw new Error('callback error')
      }

      return 'next' as const
    })

    await expect(resolveEventIterator((async function* () {
      yield 'hello'
      yield withEventMeta({ hello2: true }, { id: 'id-1', retry: 2000, comments: [] })
      yield 'hello3'
      throw new Error('test')
    })(), callback)).rejects.toThrow('callback error')

    expect(callback).toHaveBeenCalledTimes(4)
    expect(callback).toHaveBeenNthCalledWith(1, {
      event: 'message',
      data: 'hello',
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      event: 'message',
      data: { hello2: true },
      meta: { id: 'id-1', retry: 2000, comments: [] },
    })

    expect(callback).toHaveBeenNthCalledWith(3, {
      event: 'message',
      data: 'hello3',
    })

    /**
     * always emit an error event
     * even if the error is not an ErrorEvent
     * so that the iterator can be closed properly
     */
    expect(callback).toHaveBeenNthCalledWith(4, {
      event: 'error',
      data: undefined,
    })
  })
})
