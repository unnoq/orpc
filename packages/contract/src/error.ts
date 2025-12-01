import type { ORPCErrorCode } from '@orpc/client'
import type { ThrowableError } from '@orpc/shared'
import type { AnySchema, InferSchemaOutput, Schema, SchemaIssue } from './schema'
import { fallbackORPCErrorStatus, ORPCError } from '@orpc/client'

export interface ValidationErrorOptions extends ErrorOptions {
  message: string
  issues: readonly SchemaIssue[]
  /**
   * @todo require this field in v2
   */
  data?: unknown
}

/**
 * This errors usually used for ORPCError.cause when the error is a validation error.
 *
 * @see {@link https://orpc.dev/docs/advanced/validation-errors Validation Errors Docs}
 */
export class ValidationError extends Error {
  readonly issues: readonly SchemaIssue[]
  readonly data: unknown

  constructor(options: ValidationErrorOptions) {
    super(options.message, options)

    this.issues = options.issues
    this.data = options.data
  }
}

export interface ErrorMapItem<TDataSchema extends AnySchema> {
  status?: number
  message?: string
  data?: TDataSchema
}

export type ErrorMap = {
  [key in ORPCErrorCode]?: ErrorMapItem<AnySchema>
}

export type MergedErrorMap<T1 extends ErrorMap, T2 extends ErrorMap> = Omit<T1, keyof T2> & T2

export function mergeErrorMap<T1 extends ErrorMap, T2 extends ErrorMap>(errorMap1: T1, errorMap2: T2): MergedErrorMap<T1, T2> {
  return { ...errorMap1, ...errorMap2 }
}

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema extends Schema<unknown, unknown>>
      ? ORPCError<K, InferSchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]

export type ErrorFromErrorMap<TErrorMap extends ErrorMap> = ORPCErrorFromErrorMap<TErrorMap> | ThrowableError

export async function validateORPCError(map: ErrorMap, error: ORPCError<any, any>): Promise<ORPCError<string, unknown>> {
  const { code, status, message, data, cause, defined } = error
  const config = map?.[error.code]

  if (!config || fallbackORPCErrorStatus(error.code, config.status) !== error.status) {
    return defined
      ? new ORPCError(code, { defined: false, status, message, data, cause })
      : error
  }

  if (!config.data) {
    return defined
      ? error
      : new ORPCError(code, { defined: true, status, message, data, cause })
  }

  const validated = await config.data['~standard'].validate(error.data)

  if (validated.issues) {
    return defined
      ? new ORPCError(code, { defined: false, status, message, data, cause })
      : error
  }

  return new ORPCError(code, { defined: true, status, message, data: validated.value, cause })
}
