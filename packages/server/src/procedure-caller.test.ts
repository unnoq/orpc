import { z } from 'zod'
import { createProcedureCaller, ORPCError, os } from '.'

describe('createProcedureCaller', () => {
  const path = ['ping']
  const context = { auth: true }

  const osw = os.context<{ auth?: boolean }>()
  const procedure = osw
    .input(z.object({ value: z.string().transform(v => Number(v)) }))
    .output(z.object({ value: z.number().transform(v => v.toString()) }))
    .func((input, context, meta) => {
      expect(context).toEqual(context)
      expect(meta.path).toBe(path)

      return input
    })

  it('infer context', () => {
    createProcedureCaller({
      procedure,
      // @ts-expect-error invalid context
      context: { auth: 123 },
    })

    createProcedureCaller({
      procedure,
      context,
    })
  })

  it('with validate', async () => {
    const caller = createProcedureCaller({
      procedure,
      context: async () => context,
      path,
    })

    expectTypeOf(caller).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expect(await caller({ value: '123' })).toEqual({ value: '123' })

    // @ts-expect-error - invalid input
    expect(caller({ value: {} })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('without validate and schema', () => {
    const procedure = osw.func(() => {
      return { value: true }
    })

    const caller = createProcedureCaller({
      procedure,
      context,
    })

    expectTypeOf(caller).toMatchTypeOf<
      (value: unknown) => Promise<{ value: boolean }>
    >()

    expect(caller({ value: 123 })).resolves.toEqual({ value: true })
  })

  it('middlewares', () => {
    const ref = { value: 0 }

    const mid1 = vi.fn(
      osw.middleware(async (input: { id: string }, context, meta) => {
        expect(input).toEqual({ id: '1' })

        expect(ref.value).toBe(0)
        ref.value++

        try {
          const result = await meta.next({
            context: {
              userId: '1',
            },
          })
          expect(ref.value).toBe(5)
          ref.value++
          return result
        }
        finally {
          expect(ref.value).toBe(6)
          ref.value++
        }
      }),
    )

    const mid2 = vi.fn(
      osw.middleware(async (input, context, meta) => {
        expect(ref.value).toBe(1)
        ref.value++

        try {
          const result = await meta.next({})
          expect(ref.value).toBe(3)
          ref.value++
          return result
        }
        finally {
          expect(ref.value).toBe(4)
          ref.value++
        }
      }),
    )

    const ping = osw
      .input(z.object({ id: z.string() }))
      .use(mid1)
      .use(mid2)
      .func((input, context, meta) => {
        expect(context).toEqual({ userId: '1', auth: false })

        expect(ref.value).toBe(2)
        ref.value++

        return 'pong'
      })

    const caller = createProcedureCaller({
      procedure: ping,
      context: { auth: false },
    })

    expect(caller({ id: '1' })).resolves.toEqual('pong')
  })

  it('optional input when possible', async () => {
    os.func(() => { })()
    os.func(() => { })({})
    // @ts-expect-error input is required
    expect(os.input(z.string()).func(() => { })()).rejects.toThrow()
    os.input(z.string().optional()).func(() => { })()
    // @ts-expect-error input is required
    expect(os.input(z.object({})).func(() => { })()).rejects.toThrow()
    os.input(z.object({}).optional()).func(() => { })()
    os.input(z.unknown()).func(() => { })()
    os.input(z.any()).func(() => { })()
    // @ts-expect-error input is required
    expect(os.input(z.boolean()).func(() => { })()).rejects.toThrow()
  })

  it('hooks', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const onFinish = vi.fn()
    const onExecute = vi.fn()

    const procedure = os.input(z.string()).func(() => 'output')

    const caller = createProcedureCaller({
      procedure,
      context: { val: 'context' },
      execute: async (input, context, meta) => {
        onExecute(input, context, meta)
        try {
          const output = await meta.next()
          onSuccess(output, context)
          return output
        }
        catch (e) {
          onError(e, context)
          throw e
        }
      },
      onSuccess,
      onError,
      onFinish,
    })

    await caller('input')
    expect(onExecute).toBeCalledTimes(1)
    expect(onExecute).toHaveBeenCalledWith('input', { val: 'context' }, {
      path: [],
      procedure,
      next: expect.any(Function),
    })
    expect(onSuccess).toBeCalledTimes(2)
    expect(onSuccess).toHaveBeenNthCalledWith(1, 'output', { val: 'context' })
    expect(onSuccess).toHaveBeenNthCalledWith(2, 'output', { val: 'context' })
    expect(onError).not.toBeCalled()
    expect(onFinish).toBeCalledTimes(1)
    expect(onFinish).toBeCalledWith({ val: 'context' })

    onSuccess.mockClear()
    onError.mockClear()
    onFinish.mockClear()
    onExecute.mockClear()

    // @ts-expect-error - invalid input
    await expect(caller(123)).rejects.toThrowError(
      'Validation input failed',
    )

    expect(onExecute).toBeCalledTimes(1)
    expect(onExecute).toHaveBeenCalledWith(123, { val: 'context' }, {
      path: [],
      procedure,
      next: expect.any(Function),
    })
    expect(onError).toBeCalledTimes(2)
    expect(onError).toHaveBeenNthCalledWith(1, new ORPCError({
      message: 'Validation input failed',
      code: 'BAD_REQUEST',
      cause: expect.any(Error),
    }), { val: 'context' })
    expect(onError).toHaveBeenNthCalledWith(2, new ORPCError({
      message: 'Validation input failed',
      code: 'BAD_REQUEST',
      cause: expect.any(Error),
    }), { val: 'context' })
    expect(onSuccess).not.toBeCalled()
    expect(onFinish).toBeCalledTimes(1)
    expect(onFinish).toBeCalledWith({ val: 'context' })
  })
})
