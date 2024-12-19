import { oc } from '@orpc/contract'
import { z } from 'zod'
import { createChainableImplementer } from './implementer-chainable'
import { ProcedureImplementer } from './procedure-implementer'
import { RouterImplementer } from './router-implementer'

describe('createChainableImplementer', () => {
  const schema = z.object({ val: z.string().transform(val => Number(val)) })

  const ping = oc.input(schema).output(schema)
  const pong = oc.route({ method: 'GET', path: '/ping' })

  const contract = oc.router({
    ping,
    pong,
    nested: {
      ping,
      pong,
    },
  })

  const mid1 = vi.fn()
  const mid2 = vi.fn()
  const mid3 = vi.fn()

  it('with procedure', () => {
    const implementer = createChainableImplementer(ping, [mid1, mid2])

    expect(implementer).toBeInstanceOf(ProcedureImplementer)
    expect(implementer['~orpc'].middlewares).toEqual([mid1, mid2])
    expect(implementer['~orpc'].contract).toBe(ping)
  })

  it('with router', () => {
    const implementer = createChainableImplementer(contract, [mid1, mid2])

    expect(implementer.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
    expect(implementer.use(mid3)['~orpc'].contract).toBe(contract)

    expect(implementer.ping).toBeInstanceOf(ProcedureImplementer)
    expect(implementer.ping['~orpc'].middlewares).toEqual([mid1, mid2])
    expect(implementer.ping['~orpc'].contract).toBe(ping)

    expect(implementer.pong).toBeInstanceOf(ProcedureImplementer)
    expect(implementer.pong['~orpc'].middlewares).toEqual([mid1, mid2])
    expect(implementer.pong['~orpc'].contract).toBe(pong)

    expect(implementer.nested.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
    expect(implementer.nested.use(mid3)['~orpc'].contract).toBe(contract.nested)

    expect(implementer.nested.ping).toBeInstanceOf(ProcedureImplementer)
    expect(implementer.nested.ping['~orpc'].middlewares).toEqual([mid1, mid2])
    expect(implementer.nested.ping['~orpc'].contract).toBe(contract.nested.ping)

    expect(implementer.nested.pong).toBeInstanceOf(ProcedureImplementer)
    expect(implementer.nested.pong['~orpc'].middlewares).toEqual([mid1, mid2])
    expect(implementer.nested.pong['~orpc'].contract).toBe(contract.nested.pong)
  })

  describe('on conflicted', () => {
    const contract = oc.router({
      'use': ping,
      'router': {
        use: ping,
        router: pong,
      },
      '~orpc': {
        use: ping,
        router: pong,
      },
      '~type': {
        use: ping,
        router: pong,
      },
    })

    const implementer = createChainableImplementer(contract, [mid1, mid2])

    it('still works', () => {
      expect(implementer.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
      expect(implementer.use(mid3)['~orpc'].contract).toBe(contract)

      expect(implementer.use).toBeTypeOf('function')
      expect(implementer.use.use(mid3)).toBeInstanceOf(ProcedureImplementer)
      expect(implementer.use.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
      expect(implementer.use['~orpc'].contract).toBe(ping)

      expect(implementer.router).toBeTypeOf('function')
      expect(implementer.router.use(mid3)).toBeInstanceOf(RouterImplementer)
      expect(implementer.router.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
      expect(implementer.router.use(mid3)['~orpc'].contract).toBe(contract.router)

      expect(implementer.router.router).toBeTypeOf('function')
      expect(implementer.router.router.use(mid3)).toBeInstanceOf(ProcedureImplementer)
      expect(implementer.router.router.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
      expect(implementer.router.router['~orpc'].contract).toBe(contract.router.router)

      expect(implementer.router.use).toBeTypeOf('function')
      expect(implementer.router.use.use(mid3)).toBeInstanceOf(ProcedureImplementer)
      expect(implementer.router.use.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
      expect(implementer.router.use['~orpc'].contract).toBe(contract.router.use)

      expect(implementer['~orpc'].use).toBeTypeOf('function')
      expect(implementer['~orpc'].use.use(mid3)).toBeInstanceOf(ProcedureImplementer)
      expect(implementer['~orpc'].use.use(mid3)['~orpc'].middlewares).toEqual([mid1, mid2, mid3])
      expect(implementer['~orpc'].use['~orpc'].contract).toBe(contract.router.use)
    })

    it('not recursive on symbol', () => {
      expect((implementer as any)[Symbol('something')]).toBeUndefined()
      expect((implementer.use as any)[Symbol('something')]).toBeUndefined()
      expect((implementer.router as any)[Symbol('something')]).toBeUndefined()
      expect((implementer.router.use as any)[Symbol('something')]).toBeUndefined()
    })
  })
})
