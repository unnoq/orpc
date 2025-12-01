import type { MaybeOptionalOptions } from '@orpc/shared'
import type { CreateMatcherOptions, Key, Matcher, MatcherStrategy } from './types'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { isSubsetOf } from './utils'

export interface GeneralUtils<TInput> {
  /**
   * Generate a matcher function that returns `true` if the key matches the specified conditions.
   *
   * @see {@link https://orpc.dev/docs/integrations/react-swr#manual-revalidation React SWR Manual Revalidation Docs}
   */
  matcher<TStrategy extends MatcherStrategy>(
    ...rest: MaybeOptionalOptions<CreateMatcherOptions<TStrategy, TInput>>
  ): Matcher
}

export function createGeneralUtils<TInput>(path: readonly string[]): GeneralUtils<TInput> {
  return {
    matcher(...rest) {
      const { input, strategy = 'partial' } = resolveMaybeOptionalOptions(rest)

      return (key) => {
        const expectedKey = [path, { input }] satisfies Key<unknown>

        if (!isSubsetOf(expectedKey, key)) {
          return false
        }

        if (strategy === 'exact' && !isSubsetOf(key, expectedKey)) {
          return false
        }

        return true
      }
    },
  }
}
