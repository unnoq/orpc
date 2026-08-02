import type { ORPCError, ORPCErrorCode } from '@orpc/client'
import type { AnySchema, InferSchemaOutput, SchemaIssue } from './schema'

export interface ErrorMapItem {
  /**
   * Default message, can be overridden when constructing an error.
   */
  message?: undefined | string

  /**
   * Schema used to type and validate the error data.
   */
  data?: undefined | AnySchema
}

export type ErrorMap = {
  [key in ORPCErrorCode]?: ErrorMapItem
}

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: TErrorMap[K] extends ErrorMapItem
    ? ORPCError<
       K & ORPCErrorCode,
       TErrorMap[K]['data'] extends AnySchema ? InferSchemaOutput<TErrorMap[K]['data']> : unknown
    >
    : never
}[keyof TErrorMap]

export interface ValidationErrorOptions extends ErrorOptions {
  message: string
  issues: readonly SchemaIssue[]
  invalidData: unknown
}

export class ValidationError extends Error {
  /**
   * This array is readonly because the upstream Standard Schema returns readonly issues.
   */
  issues: readonly SchemaIssue[]
  invalidData: unknown

  constructor(options: ValidationErrorOptions) {
    super(options.message, options)

    this.issues = options.issues
    this.invalidData = options.invalidData
  }
}
