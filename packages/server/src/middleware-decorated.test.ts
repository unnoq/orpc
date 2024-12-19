import { decorateMiddleware } from './middleware-decorated'

describe('decorateMiddleware', () => {
  it('just a function', () => {
    const fn = vi.fn()
    const decorated = decorateMiddleware(fn) as any

    fn.mockReturnValueOnce('__mocked__')

    expect(decorated('input')).toBe('__mocked__')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('input')
  })

  it('can map input', () => {
    const fn = vi.fn()
    const map = vi.fn()
    const decorated = decorateMiddleware(fn).mapInput(map) as any

    fn.mockReturnValueOnce('__mocked__')
    map.mockReturnValueOnce('__input__')

    expect(decorated('something')).toBe('__mocked__')

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenCalledWith('something')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('__input__')
  })

  it('can concat', async () => {
    const fn = vi.fn()
    const fn2 = vi.fn()
    const next = vi.fn()

    const decorated = decorateMiddleware((input, context, meta) => {
      fn(input, context, meta)
      return meta.next({ context: { auth: true } })
    }).concat((input, context, meta) => {
      fn2(input, context, meta)
      return meta.next({})
    }) as any

    next.mockReturnValueOnce('__mocked__')

    expect((await decorated('input', undefined, { next }))).toBe('__mocked__')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('input', undefined, { next: expect.any(Function) })

    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledWith('input', { auth: true }, { next })
  })

  it('can concat with map input', async () => {
    const fn = vi.fn()
    const fn2 = vi.fn()
    const map = vi.fn()
    const next = vi.fn()

    const decorated = decorateMiddleware((input, context, meta) => {
      fn(input, context, meta)
      return meta.next({ context: { auth: true } })
    }).concat((input, context, meta) => {
      fn2(input, context, meta)
      return meta.next({})
    }, map) as any

    map.mockReturnValueOnce({ name: 'input' })
    next.mockReturnValueOnce('__mocked__')

    expect((await decorated('input', undefined, { next }))).toBe('__mocked__')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('input', undefined, { next: expect.any(Function) })

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenCalledWith('input')

    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledWith({ name: 'input' }, { auth: true }, { next })
  })
})
