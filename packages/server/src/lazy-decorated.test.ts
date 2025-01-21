import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { isLazy, lazy, unlazy } from './lazy'
import { decorateLazy } from './lazy-decorated'
import { Procedure } from './procedure'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('decorated lazy', () => {
  const schema = z.object({ val: z.string().transform(val => Number(val)) })

  const ping = new Procedure({
    contract: new ContractProcedure({
      InputSchema: schema,
      outputSchema: undefined,
      errorMap: {},
      route: {},
    }),
    handler: vi.fn(),
    middlewares: [],
    inputValidationIndex: 0,
    outputValidationIndex: 0,
  })

  const lazyPing = lazy(() => Promise.resolve({ default: ping }))

  it('still a lazy', async () => {
    expect(decorateLazy(lazyPing)).toSatisfy(isLazy)
    expect((await unlazy(decorateLazy(lazyPing))).default).toBe(ping)
  })

  it('nested access return lazy', async () => {
    const l2 = lazy(() => Promise.resolve({ default: { ping } }))
    const decoratedL2 = decorateLazy(l2)
    expect(decoratedL2.ping).toSatisfy(isLazy)
    expect((await unlazy(decoratedL2.ping)).default).toBe(ping)

    const l3 = lazy(() => Promise.resolve({ default: { ping: lazyPing } }))
    const decoratedL3 = decorateLazy(l3)
    expect(decoratedL3.ping).toSatisfy(isLazy)
    expect((await unlazy(decoratedL3.ping)).default).toBe(ping)
  })

  it('return undefined when not exists child', () => {
    const decorated = decorateLazy(lazy(() => Promise.resolve({ default: { ping: { pong: lazyPing } } }))) as any

    const child = decorated.ping.pong.peng.pang.p

    expect(child).toSatisfy(isLazy)
    expect(unlazy(child)).resolves.toEqual({ default: undefined })
  })
})
