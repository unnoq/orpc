import type { ClientPromiseResult } from '@orpc/client'
import type { ErrorFromErrorMap, ErrorMap, Meta, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { Context } from './context'
import type { Lazyable } from './lazy'
import type { Procedure } from './procedure'
import type { CreateProcedureClientOptions } from './procedure-client'
import { createProcedureClient } from './procedure-client'

/**
 * Directly call a procedure without creating a client.
 *
 * @example
 * ```ts
 * const output = await call(getting, 'input')
 * const output = await call(getting, 'input', { context: { db: 'postgres' } })
 * ```
 *
 */
export function call<
  TInitialContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
>(
  procedure: Lazyable<Procedure<TInitialContext, any, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap, TMeta>>,
  input: SchemaInput<TInputSchema>,
  ...rest: MaybeOptionalOptions<
    CreateProcedureClientOptions<
      TInitialContext,
      TInputSchema,
      TOutputSchema,
      THandlerOutput,
      TErrorMap,
      TMeta,
      Record<never, never>
    >
  >
): ClientPromiseResult<SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>> {
  return createProcedureClient(procedure, ...rest)(input)
}
