import type { Arrayable, Promisable } from 'type-fest'

export interface BaseGeneralHookMeta<TOutput> {
  next: () => Promise<TOutput>
}

export interface GeneralHook<TInput, TOutput, TContext, TMeta extends Record<string, unknown> | unknown> {
  execute?: Arrayable<(input: TInput, context: TContext, meta: BaseGeneralHookMeta<TOutput> & TMeta) => Promise<TOutput>>
  onSuccess?: Arrayable<(output: TOutput, context: TContext) => Promisable<void>>
  onError?: Arrayable<(error: Error, context: TContext) => Promisable<void>>
  onFinish?: Arrayable<(context: TContext) => Promisable<void>>
}

async function executeArrayableMethod<T extends any[], R>(
  method: Arrayable<(...args: T) => Promisable<R>> | undefined,
  ...args: T
): Promise<R | undefined> {
  if (!method) {
    return undefined
  }

  const methods = Array.isArray(method) ? method : [method]
  let result: R | undefined

  for (const fn of methods) {
    result = await fn(...args)
  }

  return result
}

export async function implementGeneralHook<TInput, TOutput, TContext, TMeta extends Record<string, unknown>>(
  options: {
    hook?: GeneralHook<TInput, TOutput, TContext, TMeta>
    input: TInput
    context: TContext
    meta: BaseGeneralHookMeta<TOutput> & TMeta
    internalOnStart?: (input: TInput, context: TContext) => Promisable<void>
    internalOnSuccess?: (output: TOutput, context: TContext) => Promisable<void>
    internalOnError?: (error: Error, context: TContext) => Promisable<void>
    internalOnFinish?: (context: TContext) => Promisable<void>
  },
): Promise<TOutput> {
  try {
    await options.internalOnStart?.(options.input, options.context)

    const output = !options.hook?.execute || !options.hook.execute.length
      ? await options.meta.next()
      : await executeArrayableMethod(options.hook.execute, options.input, options.context, options.meta) as TOutput

    await options.internalOnSuccess?.(output, options.context)
    await executeArrayableMethod(options.hook?.onSuccess, output, options.context)
    return output
  }
  catch (e) {
    const error = e instanceof Error ? e : new Error('Unknown error', { cause: e })
    await options.internalOnError?.(error, options.context)
    await executeArrayableMethod(options.hook?.onError, error, options.context)
    throw error
  }
  finally {
    await options.internalOnFinish?.(options.context)
    await executeArrayableMethod(options.hook?.onFinish, options.context)
  }
}
