import { type GeneralHook, implementGeneralHook } from '@orpc/shared'
import { useCallback, useMemo, useState } from 'react'

export type UseActionExecuteFn<TInput, TOutput> = (
  ...options:
    | [input: TInput, hooks?: GeneralHook<TInput, TOutput, undefined, unknown>]
    | (undefined extends TInput ? [] : never)
) => Promise<TOutput>

export type UseActionState<TInput, TOutput> = {
  execute: UseActionExecuteFn<TInput, TOutput>
  reset: () => void
} & (
  | {
    status: 'idle'
    isPending: false
    isError: false
    error: undefined
    data: undefined
  }
  | {
    status: 'pending'
    isPending: true
    isError: false
    error: undefined
    data: undefined
  }
  | {
    status: 'success'
    isPending: false
    isError: false
    error: undefined
    data: TOutput
  } | {
    status: 'error'
    isPending: false
    isError: true
    error: Error
    data: undefined
  }
)

const idleState = {
  status: 'idle',
  isPending: false,
  isError: false,
  error: undefined,
  data: undefined,
} as const

export function useAction<TInput, TOutput>(
  action: (input: TInput) => Promise<TOutput>,
  hooks?: GeneralHook<TInput, TOutput, undefined, unknown>,
): UseActionState<TInput, TOutput> {
  const [state, setState] = useState<Omit<UseActionState<TInput, TOutput>, 'execute' | 'reset'>>(idleState)

  const reset = useCallback(() => {
    setState(idleState)
  }, [])

  const execute = useCallback(async (input: any, executeHooks?: GeneralHook<TInput, TOutput, undefined, unknown>) => {
    const next = async () => {
      const next2 = async () => await action(input)

      return implementGeneralHook({
        context: undefined,
        hook: executeHooks,
        input,
        meta: {
          next: next2,
        },
        internalOnStart: () => {
          setState({
            status: 'pending',
            isPending: true,
            isError: false,
            error: undefined,
            data: undefined,
          })
        },
        internalOnSuccess: (output) => {
          setState({
            status: 'success',
            isPending: false,
            isError: false,
            error: undefined,
            data: output,
          })
        },
        internalOnError: (error) => {
          setState({
            status: 'error',
            isPending: false,
            isError: true,
            error,
            data: undefined,
          })
        },
      })
    }

    return implementGeneralHook({
      context: undefined,
      input,
      hook: hooks ?? {},
      meta: {
        next,
      },
    })
  }, [action, hooks])

  const result = useMemo(() => ({
    ...state,
    execute,
    reset,
  }), [state, execute, reset])

  return result as any
}
