import { AsyncIteratorClass, asyncIteratorWithSpan, isAsyncIteratorObject, replicateAsyncIterator } from './iterator'
import * as trace from './otel'

const runInSpanContextSpy = vi.spyOn(trace, 'runInSpanContext')

beforeEach(() => {
  vi.clearAllMocks()
})

it('isAsyncIteratorObject', () => {
  expect(isAsyncIteratorObject(null)).toBe(false)
  expect(isAsyncIteratorObject({})).toBe(false)
  expect(isAsyncIteratorObject(() => {})).toBe(false)
  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: 123 })).toBe(false)

  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: () => { } })).toBe(false)
  expect(isAsyncIteratorObject({ next: () => {} })).toBe(false)

  async function* gen() { }
  expect(isAsyncIteratorObject(gen())).toBe(true)

  function* gen2() { }
  expect(isAsyncIteratorObject(gen2())).toBe(false)
})

describe('asyncIteratorClass', () => {
  const next = vi.fn()
  const cleanup = vi.fn()
  let iterator: AsyncGenerator

  beforeEach(() => {
    next.mockReset()
    cleanup.mockReset()
    iterator = new AsyncIteratorClass(next, cleanup)
  })

  afterEach(async () => {
    expect(cleanup).toHaveBeenCalledTimes(1)
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('should create an object conforming to AsyncIterator protocol', async () => {
    expect(iterator).toBeDefined()
    expect(iterator).toSatisfy(isAsyncIteratorObject)
    expect(typeof iterator.next).toBe('function')
    expect(typeof iterator.return).toBe('function')
    expect(typeof iterator.throw).toBe('function')
    expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
    expect(typeof (iterator as any)[Symbol.asyncDispose]).toBe('function')

    await expect(iterator.return(undefined)).resolves.toEqual({ done: true, value: undefined })
  })

  it('should return itself when [Symbol.asyncIterator] is called', async () => {
    expect(iterator[Symbol.asyncIterator]()).toBe(iterator)

    await expect(iterator.return(undefined)).resolves.toEqual({ done: true, value: undefined })
  })

  describe('next()', () => {
    it('should call the provided next function and return its result', async () => {
      const expectedResult = { done: true, value: 42 }
      next.mockResolvedValue(expectedResult)

      const result = await iterator.next()

      expect(next).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedResult)
    })

    it('should handle multiple calls correctly', async () => {
      let time = 0
      next.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          done: time === 2,
          value: time++,
        }
      })

      await Promise.all([
        expect(iterator.next()).resolves.toEqual({ done: false, value: 0 }),
        expect(iterator.next()).resolves.toEqual({ done: false, value: 1 }),
        expect(iterator.next()).resolves.toEqual({ done: true, value: 2 }),
        expect(iterator.next()).resolves.toEqual({ done: true, value: undefined }),
      ])

      expect(next).toHaveBeenCalledTimes(3)
    })

    it('should propagate errors from the provided next function', async () => {
      const error = new Error('Something went wrong')
      next.mockRejectedValue(error)

      await expect(iterator.next()).rejects.toThrow(error)
      expect(next).toHaveBeenCalledTimes(1)
    })

    it('should call cleanup("next") when next() resolves (done: true)', async () => {
      next.mockResolvedValue({ done: true, value: undefined })
      await iterator.next()
      await iterator.next()
      await iterator.next()
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('next')
    })

    it('should call cleanup("next") when next() rejects', async () => {
      const error = new Error('Failed')
      next.mockRejectedValue(error)

      await Promise.all([
        expect(iterator.next()).rejects.toThrow(error),
        iterator.next(),
        iterator.next(),
        iterator.next(),
      ])

      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('next')
    })
  })

  describe('return()', () => {
    it('should return { done: true, value } with the provided value', async () => {
      const returnValue = 'Iterator terminated'
      expect(await iterator.return(returnValue)).toEqual({ done: true, value: returnValue })
      expect(next).toHaveBeenCalledTimes(0)
    })

    it('should call cleanup("return")', async () => {
      await Promise.all([
        iterator.return('done'),
        iterator.return('done'),
        iterator.return('done'),
      ])

      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('return')
    })
  })

  describe('throw()', () => {
    it('should re-throw the provided error', async () => {
      const error = new Error('Forced error')
      await expect(iterator.throw(error)).rejects.toThrow(error)
      expect(next).toHaveBeenCalledTimes(0)
    })

    it('should call cleanup("throw")', async () => {
      const error = new Error('Forced error')

      await Promise.all([
        expect(iterator.throw(error)).rejects.toThrow(error),
        expect(iterator.throw(error)).rejects.toThrow(error),
        expect(iterator.throw(error)).rejects.toThrow(error),
      ])

      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('throw')
    })
  })

  describe('dispose()', () => {
    it('should implement Symbol.asyncDispose', async () => {
      expect(typeof (iterator as any)[Symbol.asyncDispose]).toBe('function')

      await iterator.return(undefined)
    })

    it('should call cleanup("dispose") when disposed', async () => {
      await Promise.all([
        (iterator as any)[Symbol.asyncDispose](),
        (iterator as any)[Symbol.asyncDispose](),
        (iterator as any)[Symbol.asyncDispose](),
      ])

      expect(next).toHaveBeenCalledTimes(0)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('dispose')
    })
  })

  describe('integration with for await...of', () => {
    it('should work correctly in a for await...of loop', async () => {
      let counter = 0
      const limit = 3
      next.mockImplementation(async () => {
        if (counter < limit) {
          return { done: false, value: counter++ }
        }
        else {
          return { done: true, value: undefined }
        }
      })
      const collectedValues: any[] = []
      for await (const value of iterator) {
        collectedValues.push(value)
      }

      expect(collectedValues).toEqual([0, 1, 2])
      expect(next).toHaveBeenCalledTimes(limit + 1)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('next')
    })

    it('should call cleanup("return") when breaking a for await...of loop', async () => {
      let counter = 0
      next.mockImplementation(async () => ({ done: false, value: counter++ }))

      const collectedValues = []
      for await (const value of iterator) {
        collectedValues.push(value)
        if (value === 1) {
          break // Explicitly break the loop
        }
      }

      expect(collectedValues).toEqual([0, 1])
      expect(next).toHaveBeenCalledTimes(2)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('return')
    })

    it('should call cleanup("return") when throwing inside a for await...of loop', async () => {
      let counter = 0
      next.mockImplementation(async () => ({ done: false, value: counter++ }))
      const error = new Error('Loop error')

      const collectedValues = []
      try {
        for await (const value of iterator) {
          collectedValues.push(value)
          if (value === 1) {
            throw error
          }
        }
      }
      catch (e) {
        expect(e).toBe(error)
      }

      expect(collectedValues).toEqual([0, 1])
      expect(next).toHaveBeenCalledTimes(2)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(cleanup).toHaveBeenCalledWith('return')
    })
  })
})

describe('replicateAsyncIterator', async () => {
  it('on success', async () => {
    const gen = async function* () {
      yield 1
      await new Promise(resolve => setTimeout(resolve, 10))
      yield 2
      yield 3
      return 4
    }

    const iterators = replicateAsyncIterator(gen(), 3)

    expect(iterators.length).toBe(3)

    expect(await iterators[0]!.next()).toEqual({ done: false, value: 1 })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 1 })

    expect(await iterators[0]!.next()).toEqual({ done: false, value: 2 })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 2 })

    expect(await iterators[0]!.next()).toEqual({ done: false, value: 3 })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 3 })
    expect(await iterators[2]!.next()).toEqual({ done: false, value: 1 })

    expect(await iterators[0]!.next()).toEqual({ done: true, value: 4 })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: 4 })
    expect(await iterators[2]!.next()).toEqual({ done: false, value: 2 })

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[2]!.next()).toEqual({ done: false, value: 3 })

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[2]!.next()).toEqual({ done: true, value: 4 })

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[2]!.next()).toEqual({ done: true, value: undefined })
  })

  it('on error', { repeats: 10 }, async () => {
    const error = new Error('Something went wrong')

    const gen = async function* () {
      yield 1
      await new Promise(resolve => setTimeout(resolve, 1))
      yield 2
      yield 3
      throw error
    }

    const iterators = replicateAsyncIterator(gen(), 3)

    expect(iterators.length).toBe(3)

    expect(await iterators[0]!.next()).toEqual({ done: false, value: 1 })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 1 })

    expect(await iterators[0]!.next()).toEqual({ done: false, value: 2 })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 2 })

    expect(await iterators[0]!.next()).toEqual({ done: false, value: 3 })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 3 })
    expect(await iterators[2]!.next()).toEqual({ done: false, value: 1 })

    await expect(iterators[0]!.next()).rejects.toThrow(error)
    await expect(iterators[1]!.next()).rejects.toThrow(error)
    expect(await iterators[2]!.next()).toEqual({ done: false, value: 2 })

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[2]!.next()).toEqual({ done: false, value: 3 })

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: undefined })
    await expect(iterators[2]!.next()).rejects.toThrow(error)

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[2]!.next()).toEqual({ done: true, value: undefined })
  })

  it('on manual close', async () => {
    let cleanup = false

    const gen = async function* () {
      try {
        yield 1
        await new Promise(resolve => setTimeout(resolve, 10))
        yield 2
        await new Promise(resolve => setTimeout(resolve, 10))
        yield 3
        await new Promise(resolve => setTimeout(resolve, Number.MIN_SAFE_INTEGER))
        return 4
      }
      finally {
        cleanup = true
      }
    }

    const iterators = replicateAsyncIterator(gen(), 3)

    expect(iterators.length).toBe(3)
    expect(await iterators[0]!.next()).toEqual({ done: false, value: 1 })

    expect(await iterators[0]!.return()).toEqual({ done: true, value: undefined })
    expect(cleanup).toBe(false)

    expect(await iterators[0]!.next()).toEqual({ done: true, value: undefined })
    expect(await iterators[1]!.next()).toEqual({ done: false, value: 1 })

    expect(await iterators[1]!.return()).toEqual({ done: true, value: undefined })
    expect(cleanup).toBe(false)
    expect(await iterators[2]!.return()).toEqual({ done: true, value: undefined })
    expect(cleanup).toBe(true)
  })
})

describe('asyncIteratorWithSpan', () => {
  it('on success', async () => {
    const iterator = (async function* () {
      yield 1
      yield 2
    }())

    const withSpan = asyncIteratorWithSpan({ name: 'name' }, iterator)

    expect(await withSpan.next()).toEqual({ done: false, value: 1 })
    expect(await withSpan.next()).toEqual({ done: false, value: 2 })
    expect(await withSpan.next()).toEqual({ done: true, value: undefined })
    expect(runInSpanContextSpy).toHaveBeenCalledTimes(3)
  })

  it('on cancel', async () => {
    let cleanup = false

    const iterator = (async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        cleanup = true
      }
    }())

    const withSpan = asyncIteratorWithSpan({ name: 'name' }, iterator)

    expect(await withSpan.next()).toEqual({ done: false, value: 1 })
    expect(await withSpan.return()).toEqual({ done: true, value: undefined })
    expect(cleanup).toBe(true)
    expect(runInSpanContextSpy).toHaveBeenCalledTimes(2)
  })

  it('on error while yielding', async () => {
    const iterator = (async function* () {
      throw new Error('Forced error')
    }())

    const withSpan = asyncIteratorWithSpan({ name: 'name' }, iterator)

    await expect(withSpan.next()).rejects.toThrow('Forced error')
    expect(runInSpanContextSpy).toHaveBeenCalledTimes(1)
  })

  it('on error while cleanup', async () => {
    const iterator = (async function* () {
      try {
        yield 1
      }
      finally {
        // eslint-disable-next-line no-unsafe-finally
        throw new Error('Forced error')
      }
    }())

    const withSpan = asyncIteratorWithSpan({ name: 'name' }, iterator)

    await expect(withSpan.next()).resolves.toEqual({ done: false, value: 1 })
    await expect(withSpan.return()).rejects.toThrow('Forced error')
    expect(runInSpanContextSpy).toHaveBeenCalledTimes(2)
  })
})
