import type { GeneralHook } from '@orpc/shared'
import { type ANY_ORPC_ERROR_JSON, ORPCError } from '@orpc/server'
import { useCallback } from 'react'
import { useAction, type UseActionState } from './action-hooks'

export function useSafeAction<TInput, TOutput>(
  action: (input: TInput) => Promise<[TOutput, undefined, 'success'] | [undefined, ANY_ORPC_ERROR_JSON, 'error']>,
  hooks?: GeneralHook<TInput, TOutput, undefined, unknown>,
): UseActionState<TInput, TOutput> {
  const normal = useCallback(async (input: TInput) => {
    const [output, errorJson, status] = await action(input)

    if (status === 'error') {
      throw ORPCError.fromJSON(errorJson)
    }

    return output
  }, [action])

  const state = useAction(normal, hooks)

  return state
}
