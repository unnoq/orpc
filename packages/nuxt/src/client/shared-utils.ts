import type { MaybeOptionalOptions, PartialDeep } from '@orpc/shared'
import type { OperationKeyPrefixOptions } from './key'
import type { Matcher, MatcherOptions, MatcherStrategy } from './types'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { generateStructuredOperationKey, parseOperationKey } from './key'
import { isSubsetOf } from './utils'

export class SharedUtils<TInput> {
  constructor(
    protected readonly path: string[],
    protected readonly options: OperationKeyPrefixOptions,
  ) {}

  /**
   * Generate a matcher function that returns `true` if the key matches the specified conditions.
   * Useful for refreshing or clearing multiple `useAsyncData` entries at once.
   *
   * @see {@link https://orpc.dev/docs/integrations/nuxt#refreshing-data | Nuxt Integration - Refreshing Data}
   */
  matcher<TStrategy extends MatcherStrategy>(
    ...rest: MaybeOptionalOptions<MatcherOptions<TStrategy, TInput>>
  ): Matcher {
    const { input, strategy = 'partial' } = resolveMaybeOptionalOptions(rest)

    const expectedKey = generateStructuredOperationKey(this.path, { prefix: this.options.prefix, input: input as PartialDeep<TInput> })

    return (key) => {
      const structuredKey = parseOperationKey(key)

      if (structuredKey === undefined || !isSubsetOf(expectedKey, structuredKey)) {
        return false
      }

      if (strategy === 'exact' && !isSubsetOf(structuredKey, expectedKey)) {
        return false
      }

      return true
    }
  }
}
