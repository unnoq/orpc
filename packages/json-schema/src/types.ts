// eslint-disable-next-line no-restricted-imports
import type * as Draft2020 from 'json-schema-typed/draft-2020-12'

/**
 * A JSON Schema (draft 2020-12) representation used across oRPC's JSON schema tooling.
 *
 * @see {@link https://orpc.dev/docs/integrations/standard-schema | Standard Schema Integration}
 */
export type JsonSchema<Value = any> = Draft2020.JSONSchema<Value>
export type JsonSchemaKeywords = typeof Draft2020.keywords[number]

export enum JsonSchemaXNativeType {
  BigInt = 'bigint',
  RegExp = 'regexp',
  Date = 'date',
  Url = 'url',
  Set = 'set',
  Map = 'map',
}

// eslint-disable-next-line no-restricted-imports
export { Format as JsonSchemaFormat, TypeName as JsonSchemaType } from 'json-schema-typed/draft-2020-12'
