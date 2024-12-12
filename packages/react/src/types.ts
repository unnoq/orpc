import type { Schema, SchemaInput } from '@orpc/contract'

export type SchemaInputForInfiniteQuery<TInputSchema extends Schema> = Omit<
  SchemaInput<TInputSchema>,
  'cursor'
>

export type InferCursor<TInputSchema extends Schema> =
  SchemaInput<TInputSchema> extends { cursor?: any } ? SchemaInput<TInputSchema>['cursor'] : never
