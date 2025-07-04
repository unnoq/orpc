import { onError, onFinish, onStart, onSuccess } from '@orpc/shared'

/**
 * Like `onStart`, but defers execution, useful for updating states.
 */
export const onStartDeferred: typeof onStart = (callback, ...rest) => {
  return onStart((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 6)
  }, ...rest)
}

/**
 * Like `onSuccess`, but defers execution, useful for updating states.
 */
export const onSuccessDeferred: typeof onSuccess = (callback, ...rest) => {
  return onSuccess((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 6)
  }, ...rest)
}

/**
 * Like `onError`, but defers execution, useful for updating states.
 */
export const onErrorDeferred: typeof onError = (callback, ...rest) => {
  return onError((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 6)
  }, ...rest)
}

/**
 * Like `onFinish`, but defers execution, useful for updating states.
 */
export const onFinishDeferred: typeof onFinish = (callback, ...rest) => {
  return onFinish((...args) => {
    setTimeout(() => {
      callback(...args)
    }, 6)
  }, ...rest)
}
