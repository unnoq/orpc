import { z } from 'zod'
import { ping } from '../tests/shared'
import { isProcedure } from './procedure'
import { createActionableClient } from './procedure-action'
import { createProcedureClient } from './procedure-client'
import { DecoratedProcedure } from './procedure-decorated'

vi.mock('./middleware-decorated', () => ({
  decorateMiddleware: vi.fn(mid => ({
    mapInput: vi.fn(map => [mid, map]),
  })),
}))

vi.mock('./procedure-client', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

vi.mock('./procedure-action', async original => ({
  ...await original(),
  createActionableClient: vi.fn(() => vi.fn()),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const def = ping['~orpc']

const decorated = new DecoratedProcedure(def)

describe('decoratedProcedure', () => {
  it('.error', () => {
    const errors = {
      BAD_GATEWAY: {
        data: z.object({
          why: z.string(),
        }),
      },
    }

    const applied = decorated.errors(errors)
    expect(applied).not.toBe(decorated)
    expect(applied).toBeInstanceOf(DecoratedProcedure)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: { ...def.errorMap, ...errors },
    })
  })

  it('.meta', () => {
    const meta = { mode: 'test' } as const

    const applied = decorated.meta(meta)
    expect(applied).not.toBe(decorated)
    expect(applied).toBeInstanceOf(DecoratedProcedure)

    expect(applied['~orpc']).toEqual({
      ...def,
      meta: { ...def.meta, ...meta },
    })
  })

  it('.route', () => {
    const route = { path: '/test', method: 'GET', tags: ['hiu'] } as const

    const applied = decorated.route(route)
    expect(applied).not.toBe(decorated)
    expect(applied).toBeInstanceOf(DecoratedProcedure)

    expect(applied['~orpc']).toEqual({
      ...def,
      route: { ...def.route, ...route },
    })
  })

  describe('.use', () => {
    it('without map input', () => {
      const mid = vi.fn()

      const applied = decorated.use(mid)
      expect(applied).not.toBe(decorated)
      expect(applied).toBeInstanceOf(DecoratedProcedure)

      expect(applied['~orpc']).toEqual({
        ...def,
        middlewares: [...def.middlewares, mid],
      })
    })

    it('with map input', () => {
      const mid = vi.fn()
      const map = vi.fn()

      const applied = decorated.use(mid, map)
      expect(applied).not.toBe(decorated)
      expect(applied).toBeInstanceOf(DecoratedProcedure)

      expect(applied['~orpc']).toEqual({
        ...def,
        middlewares: [...def.middlewares, [mid, map]],
      })
    })
  })

  it('.callable', () => {
    const options = { context: { db: 'postgres' } }

    const applied = decorated.callable(options)
    expect(applied).toBeInstanceOf(Function)
    expect(applied).toSatisfy(isProcedure)

    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toBeCalledWith(decorated, options)

    // can access to function properties
    expect('name' in applied).toBe(true)
    expect(typeof applied.name).toBe('string')
    expect('length' in applied).toBe(true)
    expect(typeof applied.length).toBe('number')

    expect('use' in applied).toBe(true)
    expect('route' in applied).toBe(true)
    expect('meta' in applied).toBe(true)

    expect(applied.route({})).toBeInstanceOf(DecoratedProcedure)
    expect(applied.route({})).toEqual(decorated)
  })

  it('.actionable', () => {
    const options = { context: { db: 'postgres' } }

    const applied = decorated.actionable(options)
    expect(applied).toBeInstanceOf(Function)
    expect(applied).toSatisfy(isProcedure)

    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toBeCalledWith(decorated, options)

    expect(createActionableClient).toBeCalledTimes(1)
    expect(createActionableClient).toBeCalledWith(vi.mocked(createProcedureClient).mock.results[0]!.value)

    // can access to function properties
    expect('name' in applied).toBe(true)
    expect(typeof applied.name).toBe('string')
    expect('length' in applied).toBe(true)
    expect(typeof applied.length).toBe('number')

    expect('use' in applied).toBe(true)
    expect('route' in applied).toBe(true)
    expect('meta' in applied).toBe(true)

    expect(applied.route({})).toBeInstanceOf(DecoratedProcedure)
    expect(applied.route({})).toEqual(decorated)
  })
})
