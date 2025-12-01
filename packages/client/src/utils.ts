import type { OnFinishState, ThrowableError } from '@orpc/shared'
import type { ORPCError } from './error'
import type { ClientContext, ClientOptions, ClientPromiseResult, FriendlyClientOptions } from './types'
import { isDefinedError } from './error'

export type SafeResult<TOutput, TError>
  = | [error: null, data: TOutput, isDefined: false, isSuccess: true]
  & { error: null, data: TOutput, isDefined: false, isSuccess: true }
  | [error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, isSuccess: false]
  & { error: Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false, isSuccess: false }
  | [error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, isSuccess: false]
  & { error: Extract<TError, ORPCError<any, any>>, data: undefined, isDefined: true, isSuccess: false }

/**
 * Works like try/catch, but can infer error types.
 *
 * @info support both tuple `[error, data, isDefined, isSuccess]` and object `{ error, data, isDefined, isSuccess }` styles.
 * @see {@link https://orpc.dev/docs/client/error-handling Client Error Handling Docs}
 */
export async function safe<TOutput, TError = ThrowableError>(promise: ClientPromiseResult<TOutput, TError>): Promise<SafeResult<TOutput, TError>> {
  try {
    const output = await promise
    return Object.assign(
      [null, output, false, true] satisfies [null, TOutput, false, true],
      { error: null, data: output, isDefined: false as const, isSuccess: true as const },
    )
  }
  catch (e) {
    const error = e as TError

    if (isDefinedError(error)) {
      return Object.assign(
        [error, undefined, true, false] satisfies [typeof error, undefined, true, false],
        { error, data: undefined, isDefined: true as const, isSuccess: false as const },
      )
    }

    return Object.assign(
      [error as Exclude<TError, ORPCError<any, any>>, undefined, false, false] satisfies [Exclude<TError, ORPCError<any, any>>, undefined, false, false],
      { error: error as Exclude<TError, ORPCError<any, any>>, data: undefined, isDefined: false as const, isSuccess: false as const },
    )
  }
}

export function resolveFriendlyClientOptions<T extends ClientContext>(options: FriendlyClientOptions<T>): ClientOptions<T> {
  return {
    ...options,
    context: options.context ?? {} as T, // Context only optional if all fields are optional
  }
}

export interface ConsumeEventIteratorOptions<T, TReturn, TError> {
  /**
   * Called on each event
   */
  onEvent: (event: T) => void
  /**
   * Called once error happens
   */
  onError?: (error: TError) => void
  /**
   * Called once event iterator is done
   *
   * @info If iterator is canceled, `undefined` can be passed on success
   */
  onSuccess?: (value: TReturn | undefined) => void
  /**
   * Called once after onError or onSuccess
   *
   * @info If iterator is canceled, `undefined` can be passed on success
   */
  onFinish?: (state: OnFinishState<TReturn | undefined, TError>) => void
}

/**
 * Consumes an event iterator with lifecycle callbacks
 *
 * @warning If no `onError` or `onFinish` is provided, unhandled rejections will be thrown
 * @return unsubscribe callback
 */
export function consumeEventIterator<T, TReturn, TError = ThrowableError>(
  iterator: AsyncIterator<T, TReturn> | ClientPromiseResult<AsyncIterator<T, TReturn>, TError>,
  options: ConsumeEventIteratorOptions<T, TReturn, TError>,
): () => Promise<void> {
  void (async () => {
    let onFinishState: OnFinishState<TReturn | undefined, TError>

    try {
      const resolvedIterator = await iterator

      while (true) {
        const { done, value } = await resolvedIterator.next()

        if (done) {
          // if iterator is canceled, value can be undefined
          const realValue = value as typeof value | undefined
          onFinishState = [null, realValue, true]
          options.onSuccess?.(realValue)
          break
        }

        options.onEvent(value)
      }
    }
    catch (error) {
      onFinishState = [error as TError, undefined, false]

      /**
       * If no `onError` or `onFinish` is provided, unhandled rejections will be thrown
       * This is best practice for error handling - error should always be handled
       */
      if (!options.onError && !options.onFinish) {
        throw error
      }

      options.onError?.(error as TError)
    }
    finally {
      options.onFinish?.(onFinishState!)
    }
  })()

  return async () => {
    await (await iterator)?.return?.()
  }
}
