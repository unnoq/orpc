import type { JSONSchema } from './types'
import { isObject } from '@orpc/shared'
import { NON_LOGIC_KEYWORDS } from './schema'

/**
 * @internal
 */
export type FileSchema = JSONSchema & { type: 'string', contentMediaType: string } & object

/**
 * @internal
 */
export type ObjectSchema = JSONSchema & { type: 'object' } & object

/**
 *@internal
 */
export function isFileSchema(schema: JSONSchema): schema is FileSchema {
  return isObject(schema) && schema.type === 'string' && typeof schema.contentMediaType === 'string'
}

/**
 * @internal
 */
export function isObjectSchema(schema: JSONSchema): schema is ObjectSchema {
  return isObject(schema) && schema.type === 'object'
}

/**
 * @internal
 */
export function separateObjectSchema(schema: ObjectSchema, separatedProperties: string[]): [matched: ObjectSchema, rest: ObjectSchema] {
  const matched = { ...schema }
  const rest = { ...schema }

  matched.properties = Object.entries(schema.properties ?? {})
    .filter(([key]) => separatedProperties.includes(key))
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, JSONSchema>)

  matched.required = schema.required?.filter(key => separatedProperties.includes(key))

  matched.examples = schema.examples?.map((example) => {
    if (!isObject(example)) {
      return example
    }

    return Object.entries(example).reduce((acc, [key, value]) => {
      if (separatedProperties.includes(key)) {
        acc[key] = value
      }

      return acc
    }, {} as Record<string, unknown>)
  })

  rest.properties = Object.entries(schema.properties ?? {})
    .filter(([key]) => !separatedProperties.includes(key))
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, JSONSchema>)

  rest.required = schema.required?.filter(key => !separatedProperties.includes(key))

  rest.examples = schema.examples?.map((example) => {
    if (!isObject(example)) {
      return example
    }

    return Object.entries(example).reduce((acc, [key, value]) => {
      if (!separatedProperties.includes(key)) {
        acc[key] = value
      }

      return acc
    }, {} as Record<string, unknown>)
  })

  return [matched, rest]
}

/**
 * @internal
 */
export function filterSchemaBranches(
  schema: JSONSchema,
  check: (schema: JSONSchema) => boolean,
  matches: JSONSchema[] = [],
): [matches: JSONSchema[], rest: JSONSchema | undefined] {
  if (check(schema)) {
    matches.push(schema)
    return [matches, undefined]
  }

  if (typeof schema === 'boolean') {
    return [matches, schema]
  }

  // TODO: $ref

  if (
    schema.anyOf
    && Object.keys(schema).every(
      k => k === 'anyOf' || NON_LOGIC_KEYWORDS.includes(k as any),
    )
  ) {
    const anyOf = schema.anyOf
      .map(s => filterSchemaBranches(s, check, matches)[1])
      .filter(v => !!v)

    if (anyOf.length === 1 && typeof anyOf[0] === 'object') {
      return [matches, { ...schema, anyOf: undefined, ...anyOf[0] }]
    }

    return [matches, { ...schema, anyOf }]
  }

  // TODO: $ref

  if (
    schema.oneOf
    && Object.keys(schema).every(
      k => k === 'oneOf' || NON_LOGIC_KEYWORDS.includes(k as any),
    )
  ) {
    const oneOf = schema.oneOf
      .map(s => filterSchemaBranches(s, check, matches)[1])
      .filter(v => !!v)

    if (oneOf.length === 1 && typeof oneOf[0] === 'object') {
      return [matches, { ...schema, oneOf: undefined, ...oneOf[0] }]
    }

    return [matches, { ...schema, oneOf }]
  }

  return [matches, schema]
}
