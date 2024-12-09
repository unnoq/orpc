import { z } from 'zod'
import { createRouterCaller, ORPCError, os } from '.'

describe('createRouterCaller', () => {
  const internal = false
  const context = { auth: true }

  const osw = os.context<{ auth?: boolean }>()

  const ping = osw
    .input(z.object({ value: z.string().transform(v => Number(v)) }))
    .output(z.object({ value: z.number().transform(v => v.toString()) }))
    .func((input, context, meta) => {
      expect(context).toEqual(context)

      return input
    })

  const pong = osw.func((_, context, meta) => {
    expect(context).toEqual(context)

    return { value: true }
  })

  const lazyRouter = osw.lazy(() => Promise.resolve({
    default: {
      ping: osw.lazy(() => Promise.resolve({ default: ping })),
      pong,
      lazyRouter: osw.lazy(() => Promise.resolve({ default: { ping, pong } })),
    },
  }))

  const router = osw.router({
    ping,
    pong,
    nested: {
      ping,
      pong,
    },
    lazyRouter,
  })

  it('infer context', () => {
    createRouterCaller({
      router,
      // @ts-expect-error invalid context
      context: { auth: 123 },
    })

    createRouterCaller({
      router,
      context,
    })
  })

  it('with validate', () => {
    const caller = createRouterCaller({
      router,
      context,
    })

    expectTypeOf(caller.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expectTypeOf(caller.nested.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.nested.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expectTypeOf(caller.lazyRouter.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.lazyRouter.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expectTypeOf(caller.lazyRouter.lazyRouter.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.lazyRouter.lazyRouter.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expect(caller.ping({ value: '123' })).resolves.toEqual({ value: '123' })
    expect(caller.pong({ value: '123' })).resolves.toEqual({ value: true })

    expect(caller.nested.ping({ value: '123' })).resolves.toEqual({
      value: '123',
    })
    expect(caller.nested.pong({ value: '123' })).resolves.toEqual({
      value: true,
    })

    expect(caller.lazyRouter.ping({ value: '123' })).resolves.toEqual({
      value: '123',
    })
    expect(caller.lazyRouter.pong({ value: '123' })).resolves.toEqual({
      value: true,
    })

    expect(caller.lazyRouter.lazyRouter.ping({ value: '123' })).resolves.toEqual({
      value: '123',
    })
    expect(caller.lazyRouter.lazyRouter.pong({ value: '123' })).resolves.toEqual({
      value: true,
    })

    // @ts-expect-error - invalid input
    expect(caller.ping({ value: new Date('2023-01-01') })).rejects.toThrowError(
      'Validation input failed',
    )

    // @ts-expect-error - invalid input
    expect(caller.nested.ping({ value: true })).rejects.toThrowError(
      'Validation input failed',
    )

    // @ts-expect-error - invalid input
    expect(caller.lazyRouter.ping({ value: true })).rejects.toThrowError(
      'Validation input failed',
    )

    // @ts-expect-error - invalid input
    expect(caller.lazyRouter.lazyRouter.ping({ value: true })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('path', () => {
    const ping = osw.func((_, __, { path }) => {
      return path
    })

    const lazyRouter = osw.lazy(() => Promise.resolve({
      default: {
        ping: osw.lazy(() => Promise.resolve({ default: ping })),
        lazyRouter: osw.lazy(() => Promise.resolve({ default: { ping } })),
      },
    }))

    const router = osw.router({
      ping,
      nested: {
        ping,
        child: {
          ping,
        },
      },
      lazyRouter,
    })

    const caller = createRouterCaller({
      router,
      context,
    })

    expect(caller.ping('')).resolves.toEqual(['ping'])
    expect(caller.nested.ping('')).resolves.toEqual(['nested', 'ping'])
    expect(caller.nested.child.ping('')).resolves.toEqual([
      'nested',
      'child',
      'ping',
    ])
    expect(caller.lazyRouter.ping()).resolves.toEqual(['lazyRouter', 'ping'])
    expect(caller.lazyRouter.lazyRouter.ping('')).resolves.toEqual([
      'lazyRouter',
      'lazyRouter',
      'ping',
    ])
  })

  it('hooks', async () => {
    const onStart = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()
    const onExecute = vi.fn()

    const procedure = os.input(z.string()).func(() => 'output')

    const context = { val: 'context' }
    const caller = createRouterCaller({
      router: { procedure, nested: { procedure } },
      context,
      execute: async (input, context, meta) => {
        onStart(input, context, meta)
        onExecute(input, context, meta)
        try {
          const output = await meta.next()
          onSuccess(output, context, meta)
          return output
        }
        catch (e) {
          onError(e, context, meta)
          throw e
        }
      },
      onStart,
      onSuccess,
      onError,
      onFinish,
    })

    const meta = {
      path: ['procedure'],
      procedure,
    }

    await caller.procedure('input')
    expect(onStart).toBeCalledTimes(2)
    expect(onStart).toHaveBeenNthCalledWith(1, 'input', context, { ...meta, next: expect.any(Function) })
    expect(onStart).toHaveBeenNthCalledWith(2, { input: 'input', status: 'pending' }, context, meta)
    expect(onExecute).toBeCalledTimes(1)
    expect(onExecute).toHaveBeenCalledWith('input', context, { ...meta, next: expect.any(Function) })
    expect(onSuccess).toBeCalledTimes(2)
    expect(onSuccess).toHaveBeenNthCalledWith(1, { output: 'output', input: 'input', status: 'success' }, context, meta)
    expect(onSuccess).toHaveBeenNthCalledWith(2, 'output', context, { ...meta, next: expect.any(Function) })
    expect(onError).not.toBeCalled()
    expect(onFinish).toBeCalledTimes(1)
    expect(onFinish).toBeCalledWith({ output: 'output', input: 'input', status: 'success' }, context, meta)

    onSuccess.mockClear()
    onError.mockClear()
    onFinish.mockClear()
    onExecute.mockClear()

    // @ts-expect-error - invalid input
    await expect(caller.nested.procedure(123)).rejects.toThrowError(
      'Validation input failed',
    )

    const meta2 = {
      path: ['nested', 'procedure'],
      procedure,
    }

    const error2 = new ORPCError({
      message: 'Validation input failed',
      code: 'BAD_REQUEST',
      cause: expect.any(Error),
    })

    expect(onExecute).toBeCalledTimes(1)
    expect(onExecute).toHaveBeenCalledWith(123, context, { ...meta2, next: expect.any(Function) })
    expect(onError).toBeCalledTimes(2)
    expect(onError).toHaveBeenNthCalledWith(1, { input: 123, error: error2, status: 'error' }, context, meta2)
    expect(onError).toHaveBeenNthCalledWith(2, error2, context, { ...meta2, next: expect.any(Function) })
    expect(onSuccess).not.toBeCalled()
    expect(onFinish).toBeCalledTimes(1)
    expect(onFinish).toBeCalledWith({ input: 123, error: error2, status: 'error' }, context, meta2)
  })
})
