import { getTracer, runWithSpan, setTracer, startSpan, toOtelException, toSpanAttributeValue } from './tracing'

function createMockSpan(name = 'test-span') {
  return {
    name,
    end: vi.fn(),
    recordException: vi.fn(),
    setStatus: vi.fn(),
  }
}

function createMockTracer() {
  return {
    startSpan: vi.fn(),
    startActiveSpan: vi.fn(),
  }
}

beforeEach(() => {
  const originalTracer = getTracer()

  setTracer(undefined)

  afterEach(() => {
    setTracer(originalTracer)
  })
})

describe('tracing', () => {
  describe('startSpan', () => {
    it('returns undefined when no global tracer is set', () => {
      expect(startSpan('test-span')).toBeUndefined()
    })

    it('creates and returns a span when global tracer is set', () => {
      const mockSpan = createMockSpan()
      const mockTracer = createMockTracer()
      mockTracer.startSpan.mockReturnValue(mockSpan)

      setTracer(mockTracer as any)

      const result = startSpan('test-span', { attributes: { key: 'value' } })

      expect(result).toBe(mockSpan)
      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-span', { attributes: { key: 'value' } })
    })
  })

  describe('runWithSpan', () => {
    it('executes function without span when no global tracer is set', async () => {
      const fn = vi.fn().mockResolvedValue(123)

      const result = await runWithSpan('test-span', fn)

      expect(fn).toHaveBeenCalledWith()
      expect(result).toBe(123)
    })

    it('executes function with active span when global tracer is set', async () => {
      const mockSpan = createMockSpan()
      const mockTracer = createMockTracer()
      mockTracer.startActiveSpan.mockImplementation((name, options, callback) =>
        callback(mockSpan),
      )
      setTracer(mockTracer as any)

      const fn = vi.fn().mockResolvedValue(456)

      const result = await runWithSpan('test-span', fn)

      expect(result).toBe(456)
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('test-span', {}, expect.any(Function))
      expect(fn).toHaveBeenCalledWith(mockSpan)
      expect(mockSpan.end).toHaveBeenCalled()
    })

    it('records and re-throws Error exceptions', async () => {
      const mockSpan = createMockSpan()
      const mockTracer = createMockTracer()
      mockTracer.startActiveSpan.mockImplementation((name, options, callback) =>
        callback(mockSpan),
      )
      setTracer(mockTracer as any)

      const error = new Error('Test error')
      const fn = vi.fn().mockRejectedValue(error)

      await expect(runWithSpan('test-span', fn)).rejects.toThrow('Test error')

      expect(mockSpan.recordException).toHaveBeenCalledWith({ message: 'Test error', name: 'Error', stack: error.stack })
      expect(mockSpan.end).toHaveBeenCalled()
    })
  })

  describe('toOtelException', () => {
    it('converts Error objects to OpenTelemetry Exception format', () => {
      const error = new Error('Test error message')
      error.name = 'TestError'
      error.stack = 'Error: Test error message\n    at test.js:1:1'

      const result = toOtelException(error)

      expect(result).toEqual({
        message: 'Test error message',
        name: 'TestError',
        stack: 'Error: Test error message\n    at test.js:1:1',
      })
    })

    it('includes code property when Error has string code', () => {
      const error = new Error('Network error') as any
      error.code = 'ECONNREFUSED'

      const result = toOtelException(error)

      expect(result).toEqual({
        message: 'Network error',
        name: 'Error',
        stack: error.stack,
        code: 'ECONNREFUSED',
      })
    })

    it('includes code property when Error has numeric code', () => {
      const error = new Error('HTTP error') as any
      error.code = 404

      const result = toOtelException(error)

      expect(result).toEqual({
        message: 'HTTP error',
        name: 'Error',
        stack: error.stack,
        code: 404,
      })
    })

    it('excludes code property when it is not string or number', () => {
      const error = new Error('Test error') as any
      error.code = { custom: 'object' }

      const result = toOtelException(error)

      expect(result).toEqual({
        message: 'Test error',
        name: 'Error',
        stack: error.stack,
      })
      expect(result).not.toHaveProperty('code')
    })

    it('converts non-Error objects to Exception with string message', () => {
      const result1 = toOtelException('Plain string error')
      expect(result1).toEqual({ message: 'Plain string error' })

      const result2 = toOtelException(42)
      expect(result2).toEqual({ message: '42' })

      const result3 = toOtelException({ custom: 'error' })
      expect(result3).toEqual({ message: '[object Object]' })

      const result4 = toOtelException(null)
      expect(result4).toEqual({ message: 'null' })

      const result5 = toOtelException(undefined)
      expect(result5).toEqual({ message: 'undefined' })
    })

    it('handles custom Error objects', () => {
      class CustomError extends Error {
        code = 'CUSTOM_ERROR'
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const error = new CustomError('Custom error message')
      const result = toOtelException(error)

      expect(result).toEqual({
        message: 'Custom error message',
        name: 'CustomError',
        code: 'CUSTOM_ERROR',
        stack: error.stack,
      })
    })
  })

  it('toSpanAttributeValue serializes data correctly', () => {
    const data = {
      key: 'value',
      num: 123,
      bool: true,
      arr: [1, 2, 3],
      bigint: 123n,
      set: new Set([1, 2, 3]),
      map: new Map([['a', 1], ['b', 2]]),
    }

    expect(toSpanAttributeValue(data)).toEqual('{"key":"value","num":123,"bool":true,"arr":[1,2,3],"bigint":"123","set":[1,2,3],"map":[["a",1],["b",2]]}')
    expect(toSpanAttributeValue({
      toJSON() {
        throw new Error('Custom error')
      },
    })).toEqual('[object Object]')

    expect(toSpanAttributeValue(undefined)).toEqual('undefined')
  })
})
