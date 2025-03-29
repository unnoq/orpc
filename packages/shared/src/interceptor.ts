import type { Promisable } from 'type-fest'

export type InterceptableOptions = Record<string, any>

export type InterceptorOptions<
  TOptions extends InterceptableOptions,
  TResult,
  TError,
> = Omit<TOptions, 'next'> & {
  next(options?: TOptions): Promise<TResult> & { __error?: { type: TError } }
}

export type Interceptor<
  TOptions extends InterceptableOptions,
  TResult,
  TError,
> = (options: InterceptorOptions<TOptions, TResult, TError>) => Promise<TResult> & { __error?: { type: TError } }

/**
 * Can used for interceptors or middlewares
 */
export function onStart<TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(options: TOptions, ...rest: TRest) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => Promise<Awaited<ReturnType<TOptions['next']>>> {
  return async (options, ...rest) => {
    await callback(options, ...rest)
    return await options.next()
  }
}

/**
 * Can used for interceptors or middlewares
 */
export function onSuccess<TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(result: Awaited<ReturnType<TOptions['next']>>, options: TOptions, ...rest: TRest) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => Promise<Awaited<ReturnType<TOptions['next']>>> {
  return async (options, ...rest) => {
    const result = await options.next()
    await callback(result, options, ...rest)
    return result
  }
}

/**
 * Can used for interceptors or middlewares
 */
export function onError<TError, TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(error: TError, options: TOptions, ...rest: TRest) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => Promise<Awaited<ReturnType<TOptions['next']>>> & { __error?: { type: TError } } {
  return async (options, ...rest) => {
    try {
      return await options.next()
    }
    catch (error) {
      await callback(error as TError, options, ...rest)
      throw error
    }
  }
}

export type OnFinishState<TResult, TError> = [TResult, null, 'success'] | [undefined, TError, 'error']

/**
 * Can used for interceptors or middlewares
 */
export function onFinish<TError, TOptions extends { next(): any }, TRest extends any[]>(
  callback: NoInfer<(state: OnFinishState<Awaited<ReturnType<TOptions['next']>>, TError>, options: TOptions, ...rest: TRest) => Promisable<void>>,
): (options: TOptions, ...rest: TRest) => Promise<Awaited<ReturnType<TOptions['next']>>> & { __error?: { type: TError } } {
  let state: OnFinishState<Awaited<ReturnType<TOptions['next']>>, TError> | undefined
  return async (options, ...rest) => {
    try {
      const result = await options.next()
      state = [result, null, 'success']
      return result
    }
    catch (error) {
      state = [undefined, error as TError, 'error']
      throw error
    }
    finally {
      await callback(state as Exclude<typeof state, undefined>, options, ...rest)
    }
  }
}

export async function intercept<TOptions extends InterceptableOptions, TResult, TError>(
  interceptors: Interceptor<TOptions, TResult, TError>[],
  options: NoInfer<TOptions>,
  main: NoInfer<(options: TOptions) => Promisable<TResult>>,
): Promise<TResult> {
  let index = 0

  const next = async (options: TOptions): Promise<TResult> => {
    const interceptor = interceptors[index++]

    if (!interceptor) {
      return await main(options)
    }

    return await interceptor({
      ...options,
      next: (newOptions: TOptions = options) => next(newOptions),
    })
  }

  return await next(options)
}
