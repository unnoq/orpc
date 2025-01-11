import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { isProcedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { DecoratedProcedure } from './procedure-decorated'

vi.mock('./procedure-client', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const handler = vi.fn(() => ({ val: '123' }))
const mid = vi.fn(({ next }, _, __) => next({}))

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })
const baseErrors = {
  CODE: {
    status: 500,
    data: z.object({ why: z.string() }),
  },
}
const decorated = new DecoratedProcedure({
  contract: new ContractProcedure({
    InputSchema: schema,
    OutputSchema: schema,
    route: { path: '/test', method: 'GET', deprecated: true, description: 'des', summary: 'sum', tags: ['hi'] },
    inputExample: { val: 123 },
    outputExample: { val: 456 },
    errorMap: baseErrors,
  }),
  handler,
  middlewares: [mid],
})

describe('self chainable', () => {
  it('prefix', () => {
    const prefixed = decorated.prefix('/test')

    expect(prefixed).not.toBe(decorated)

    expect(prefixed).toSatisfy(isProcedure)
    expect(prefixed['~orpc'].contract['~orpc'].route?.path).toBe('/test/test')
    expect(prefixed['~orpc'].contract['~orpc'].errorMap).toBe(baseErrors)
    expect(prefixed['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(prefixed['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(prefixed['~orpc'].middlewares).toEqual([mid])
    expect(prefixed['~orpc'].handler).toBe(handler)
  })

  it('route', () => {
    const route = { path: '/test', method: 'GET', tags: ['hiu'] } as const
    const routed = decorated.route(route)

    expect(routed).not.toBe(decorated)
    expect(routed).toSatisfy(isProcedure)
    expect(routed['~orpc'].contract['~orpc'].route).toEqual({
      path: '/test',
      method: 'GET',
      deprecated: true,
      description: 'des',
      summary: 'sum',
      tags: ['hiu'],
    })

    expect(routed['~orpc'].contract['~orpc'].errorMap).toBe(baseErrors)
    expect(routed['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(routed['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(routed['~orpc'].middlewares).toEqual([mid])
    expect(routed['~orpc'].handler).toBe(handler)
  })

  it('use middleware', () => {
    const extraMid = vi.fn()

    const applied = decorated.use(extraMid)

    expect(applied).not.toBe(decorated)
    expect(applied).toSatisfy(isProcedure)
    expect(applied['~orpc'].middlewares).toEqual([mid, extraMid])

    expect(applied['~orpc'].contract['~orpc'].errorMap).toBe(baseErrors)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(applied['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(applied['~orpc'].handler).toBe(handler)
  })

  it('use middleware with map input', () => {
    const extraMid = vi.fn()
    const map = vi.fn()

    const applied = decorated.use(extraMid, map)
    expect(applied).not.toBe(decorated)
    expect(applied).toSatisfy(isProcedure)
    expect(applied['~orpc'].middlewares).toEqual([mid, expect.any(Function)])
    expect(applied['~orpc'].contract['~orpc'].errorMap).toBe(baseErrors)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(applied['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(applied['~orpc'].handler).toBe(handler)

    extraMid.mockReturnValueOnce('__extra__')
    map.mockReturnValueOnce('__map__')

    expect((applied as any)['~orpc'].middlewares[1]({}, 'input', '__output__')).toBe('__extra__')

    expect(map).toBeCalledTimes(1)
    expect(map).toBeCalledWith('input')

    expect(extraMid).toBeCalledTimes(1)
    expect(extraMid).toBeCalledWith({}, '__map__', '__output__')
  })

  it('unshiftTag', () => {
    const tagged = decorated.unshiftTag('test', 'test2', 'test3')
    expect(tagged).not.toBe(decorated)
    expect(tagged).toSatisfy(isProcedure)
    expect(tagged['~orpc'].contract['~orpc'].route?.tags).toEqual(['test', 'test2', 'test3', 'hi'])

    expect(tagged['~orpc'].contract['~orpc'].errorMap).toBe(baseErrors)
    expect(tagged['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(tagged['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(tagged['~orpc'].middlewares).toEqual([mid])
    expect(tagged['~orpc'].handler).toBe(handler)
  })

  it('unshiftMiddleware', () => {
    const mid1 = vi.fn()
    const mid2 = vi.fn()

    const applied = decorated.unshiftMiddleware(mid1, mid2)
    expect(applied).not.toBe(decorated)
    expect(applied).toSatisfy(isProcedure)
    expect(applied['~orpc'].middlewares).toEqual([mid1, mid2, mid])

    expect(applied['~orpc'].contract['~orpc'].errorMap).toBe(baseErrors)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toBe(schema)
    expect(applied['~orpc'].contract['~orpc'].OutputSchema).toBe(schema)
    expect(applied['~orpc'].handler).toBe(handler)
  })

  describe('unshiftMiddleware --- prevent duplicate', () => {
    const mid1 = vi.fn()
    const mid2 = vi.fn()
    const mid3 = vi.fn()
    const mid4 = vi.fn()
    const mid5 = vi.fn()

    it('no duplicate', () => {
      expect(
        decorated.unshiftMiddleware(mid1, mid2)['~orpc'].middlewares,
      ).toEqual([mid1, mid2, mid])
    })

    it('case 1', () => {
      expect(
        decorated.unshiftMiddleware(mid1, mid2).unshiftMiddleware(mid1, mid3)['~orpc'].middlewares,
      ).toEqual([mid1, mid3, mid2, mid])
    })

    it('case 2', () => {
      expect(
        decorated.unshiftMiddleware(mid1, mid2, mid3, mid4).unshiftMiddleware(mid1, mid4, mid2, mid3)['~orpc'].middlewares,
      ).toEqual([mid1, mid4, mid2, mid3, mid4, mid])
    })

    it('case 3', () => {
      expect(
        decorated.unshiftMiddleware(mid1, mid5, mid2, mid3, mid4).unshiftMiddleware(mid1, mid4, mid2, mid3)['~orpc'].middlewares,
      ).toEqual([mid1, mid4, mid2, mid3, mid5, mid2, mid3, mid4, mid])
    })

    it('case 4', () => {
      expect(
        decorated
          .unshiftMiddleware(mid2, mid2)
          .unshiftMiddleware(mid1, mid2)['~orpc'].middlewares,
      ).toEqual([mid1, mid2, mid2, mid])
    })

    it('case 5', () => {
      expect(
        decorated
          .unshiftMiddleware(mid2, mid2)
          .unshiftMiddleware(mid1, mid2, mid2)['~orpc'].middlewares,
      ).toEqual([mid1, mid2, mid2, mid])
    })
  })

  describe('callable', () => {
    it('works', () => {
      const options = { context: { auth: true } }

      const callable = decorated.callable(options)

      expect(callable).toBeInstanceOf(Function)
      expect(callable).toSatisfy(isProcedure)
      expect(createProcedureClient).toBeCalledTimes(1)
      expect(createProcedureClient).toBeCalledWith(decorated, options)
    })

    it('can chain after callable', () => {
      const mid2 = vi.fn()

      const applied = decorated.callable({
        context: { auth: true },
      }).use(mid2)

      expect(applied).not.toBeInstanceOf(Function)
      expect(applied).toSatisfy(isProcedure)
      expect(applied['~orpc'].middlewares).toEqual([mid, mid2])
    })
  })

  describe('actionable', () => {
    it('works', () => {
      const options = { context: { auth: true } }
      const actionable = decorated.actionable(options)

      expect(actionable).toBeInstanceOf(Function)
      expect(actionable).toSatisfy(isProcedure)
      expect(createProcedureClient).toBeCalledTimes(1)
      expect(createProcedureClient).toBeCalledWith(decorated, options)
    })

    it('can chain after actionable', () => {
      const mid2 = vi.fn()

      const applied = decorated.actionable({
        context: { auth: true },
      }).use(mid2)

      expect(applied).not.toBeInstanceOf(Function)
      expect(applied).toSatisfy(isProcedure)
      expect(applied['~orpc'].middlewares).toEqual([mid, mid2])
    })
  })
})

it('can use middleware when has no middleware', () => {
  const decorated = new DecoratedProcedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: undefined,
    }),
    handler: () => { },
  })

  const mid = vi.fn()
  const applied = decorated.use(mid)

  expect(applied).not.toBe(decorated)
  expect(applied).toSatisfy(isProcedure)
  expect(applied['~orpc'].middlewares).toEqual([mid])
})

it('can unshift middleware when has no middleware', () => {
  const decorated = new DecoratedProcedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: undefined,
    }),
    handler: () => { },
  })

  const mid1 = vi.fn()
  const mid2 = vi.fn()
  const applied = decorated.unshiftMiddleware(mid1, mid2)

  expect(applied).not.toBe(decorated)
  expect(applied).toSatisfy(isProcedure)
  expect(applied['~orpc'].middlewares).toEqual([mid1, mid2])
})
