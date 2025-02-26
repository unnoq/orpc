import type { Client, ClientContext } from '@orpc/client'
import type { ErrorFromErrorMap, ErrorMap } from './error'
import type { Schema, SchemaInput, SchemaOutput } from './schema'

export type ContractProcedureClient<
  TClientContext extends ClientContext,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TErrorMap extends ErrorMap,
> = Client<TClientContext, SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema>, ErrorFromErrorMap<TErrorMap>>
