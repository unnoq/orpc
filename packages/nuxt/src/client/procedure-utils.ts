import type { Client, ClientContext } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { OperationKeyOptions, OperationKeyPrefixOptions } from './key'
import type { AsyncDataArgs, AsyncDataArgsOptions, KeyOptions, OperationContext } from './types'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { computed, toValue } from 'vue'
import { generateOperationKey } from './key'
import { SharedUtils } from './shared-utils'
import { OPERATION_CONTEXT_SYMBOL } from './types'

export interface ProcedureUtilsOptions extends OperationKeyPrefixOptions {
}

export class ProcedureUtils<TClientContext extends ClientContext, TInput, TOutput, TError> extends SharedUtils<TInput> {
  /**
   * Calling corresponding procedure client
   *
   * @see {@link https://orpc.dev/docs/integrations/nuxt#calling-clients | Nuxt Integration - Calling Clients}
   */
  call: Client<TClientContext, TInput, TOutput, TError>

  constructor(
    path: string[],
    client: Client<TClientContext, TInput, TOutput, TError>,
    options: ProcedureUtilsOptions = {},
  ) {
    super(path, options)
    this.call = client
  }

  /**
   * Generate a **full matching** string key for `useAsyncData` and related composables.
   *
   * @see {@link https://orpc.dev/docs/integrations/nuxt#operation-key | Nuxt Integration - Operation Key}
   */
  key(
    ...rest: MaybeOptionalOptions<KeyOptions<TInput>>
  ): string {
    const options = resolveMaybeOptionalOptions(rest)

    return generateOperationKey(this.path, { ...options, prefix: this.options.prefix } as OperationKeyOptions<TInput>)
  }

  /**
   * Generate arguments for `useAsyncData` and `useLazyAsyncData`.
   * The input can be a plain value, a `ref`, or a getter; the generated key
   * updates reactively when the input changes.
   *
   * @see {@link https://orpc.dev/docs/integrations/nuxt#data-fetching | Nuxt Integration - Data Fetching}
   */
  asyncDataArgs(
    ...rest: MaybeOptionalOptions<AsyncDataArgsOptions<TClientContext, TInput>>
  ): AsyncDataArgs<TOutput, TError> {
    const options = resolveMaybeOptionalOptions(rest)

    const key = computed(() => generateOperationKey(this.path, {
      prefix: this.options.prefix,
      input: toValue(options.input) as any,
    }))

    return [
      key,
      () => this.call(toValue(options.input) as TInput, {
        context: {
          [OPERATION_CONTEXT_SYMBOL]: { key: key.value, type: 'asyncData' },
          ...options.context,
        } satisfies OperationContext as any,
      }),
    ] as const
  }
}
