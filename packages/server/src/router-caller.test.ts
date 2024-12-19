import { ContractProcedure } from '@orpc/contract'
import { z } from 'zod'
import { isLazy, lazy, unlazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'
import { createRouterCaller } from './router-caller'

vi.mock('./procedure-caller', () => ({
  createProcedureCaller: vi.fn(() => vi.fn(() => '__mocked__')),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createRouterCaller', () => {
  const schema = z.object({ val: z.string().transform(v => Number(v)) })
  const ping = new Procedure({
    contract: new ContractProcedure({
      InputSchema: schema,
      OutputSchema: schema,
    }),
    func: vi.fn(() => ({ val: '123' })),
  })
  const pong = new Procedure({
    contract: new ContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
    }),
    func: vi.fn(() => ('output')),
  })

  const router = {
    ping: lazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: lazy(() => Promise.resolve({ default: {
      ping,
      pong: lazy(() => Promise.resolve({ default: pong })),
    } })),
  }

  const caller = createRouterCaller({
    router,
    context: { auth: true },
    path: ['users'],
  })

  it('works', () => {
    expect(caller.pong({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(1)
    expect(createProcedureCaller).toBeCalledWith(expect.objectContaining({
      procedure: pong,
      context: { auth: true },
      path: ['users', 'pong'],
    }))

    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledWith({ val: '123' })
  })

  it('work with lazy', async () => {
    expect(caller.ping({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(1)
    expect(createProcedureCaller).toHaveBeenNthCalledWith(1, expect.objectContaining({
      procedure: expect.any(Object),
      context: { auth: true },
      path: ['users', 'ping'],
    }))

    expect((await unlazy(vi.mocked(createProcedureCaller as any).mock.calls[0]![0].procedure)).default).toBe(ping)

    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledWith({ val: '123' })
  })

  it('work with nested lazy', async () => {
    expect(caller.nested.ping({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(2)
    expect(createProcedureCaller).toHaveBeenNthCalledWith(2, expect.objectContaining({
      procedure: expect.any(Object),
      context: { auth: true },
      path: ['users', 'nested', 'ping'],
    }))

    const lazied = vi.mocked(createProcedureCaller as any).mock.calls[1]![0].procedure
    expect(await unlazy(lazied)).toEqual({ default: ping })

    expect(vi.mocked(createProcedureCaller).mock.results[1]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[1]?.value).toBeCalledWith({ val: '123' })
  })

  it('work with procedure as router', () => {
    const caller = createRouterCaller({
      router: ping,
      context: { auth: true },
      path: ['users'],
    })

    expect(caller({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(1)
    expect(createProcedureCaller).toHaveBeenCalledWith(expect.objectContaining({
      procedure: ping,
      context: { auth: true },
      path: ['users'],
    }))

    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureCaller).mock.results[0]?.value).toBeCalledWith({ val: '123' })
  })

  it('hooks', async () => {
    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()
    const execute = vi.fn()

    const caller = createRouterCaller({
      router,
      context: { auth: true },
      onStart,
      onSuccess,
      onError,
      onFinish,
      execute,
    })

    expect(caller.pong({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureCaller).toBeCalledTimes(1)
    expect(createProcedureCaller).toHaveBeenCalledWith(expect.objectContaining({
      procedure: pong,
      context: { auth: true },
      path: ['pong'],
      onStart,
      onSuccess,
      onError,
      onFinish,
      execute,
    }))
  })

  it('not recursive on symbol', () => {
    expect((caller as any)[Symbol('something')]).toBeUndefined()
  })

  it('throw error if call on invalid lazy', async () => {
    const caller = createRouterCaller({
      router: lazy(() => Promise.resolve({ default: undefined })),
    })

    // @ts-expect-error --- invalid lazy
    caller.router.ping.pong({ val: '123' })

    const procedure = vi.mocked(createProcedureCaller).mock.calls[0]![0].procedure

    expect(procedure).toSatisfy(isLazy)

    expect(unlazy(procedure)).rejects.toThrow('Expected a valid procedure or lazy<procedure> but got unknown.')
  })

  it('return undefined if access the undefined key', async () => {
    const caller = createRouterCaller({
      router: {
        ping,
      },
    })

    // @ts-expect-error --- invalid access
    expect(caller.router).toBeUndefined()
  })

  it('works without base path', async () => {
    const caller = createRouterCaller({
      router: {
        ping,
      },
    })

    expect(caller.ping({ val: '123' })).toEqual('__mocked__')
    expect(vi.mocked(createProcedureCaller).mock.calls[0]![0].path).toEqual(['ping'])
  })
})
