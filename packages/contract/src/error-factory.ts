import type { ORPCErrorCode, ORPCErrorOptions } from '@orpc/client'
import type { MaybeOptionalOptions, Writable } from '@orpc/shared'
import type { ErrorMap, ErrorMapItem } from './error'
import type { AnySchema, InferSchemaInput, Schema } from './schema'

import { ORPCError } from '@orpc/client'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { type } from './schema-utils'

export interface ORPCErrorFactoryOptions<TCode extends ORPCErrorCode, TData> {
  /**
   * The error code carried by every error the factory creates.
   */
  code: TCode

  /**
   * Optional schema used to type and validate the error data.
   */
  data?: Schema<TData>

  /**
   * Optional default message, can be overridden when constructing an error.
   */
  message?: string
}

export interface ORPCErrorFactory<TCode extends ORPCErrorCode, TData> extends ErrorMapItem {
  code: TCode
  data: Schema<TData>
  new (...rest: MaybeOptionalOptions<ORPCErrorOptions<TData>>): ORPCError<TCode, TData>
}

/**
 * Creates a reusable error class ({@link ORPCErrorFactory}) for the given code,
 * default message, and data schema.
 *
 * The returned class extends {@link ORPCError}, so it can be thrown anywhere
 * and used directly as an error map item. Its `instanceof` matches any
 * `ORPCError` with the same code whose data passes the schema, even instances
 * not created by the class - but throws a `TypeError` when the data schema
 * validates asynchronously.
 *
 * @example
 * ```ts
 * const RateLimitedError = error({
 *   code: 'RATE_LIMITED',
 *   message: 'You are being rate limited',
 *   data: z.object({ retryAfter: z.number() }),
 * })
 *
 * const procedure = os
 *   .errors({ [RateLimitedError.code]: RateLimitedError })
 *   .handler(() => {
 *     throw new RateLimitedError({ data: { retryAfter: 60 } })
 *   })
 *
 * try {
 *   const output = call(procedure)
 * } catch (error) {
 *   if (error instanceof RateLimitedError) {
 *     console.log(error.data.retryAfter)
 *   }
 * }
 * ```
 *
 * @see {@link https://orpc.dev/docs/error-handling#error-factory Error Factory Docs}
 */
export function error<TCode extends ORPCErrorCode, TData = unknown>(
  { code, data, message }: ORPCErrorFactoryOptions<TCode, TData>,
): ORPCErrorFactory<TCode, TData> {
  return class extends ORPCError<TCode, TData> {
    static code: TCode = code
    static data: Schema<TData> = data ?? type<any>()
    static message: string | undefined = message

    constructor(...rest: MaybeOptionalOptions<ORPCErrorOptions<TData>>) {
      const options = resolveMaybeOptionalOptions(rest)
      super(code, { message, ...options })
    }

    static override[Symbol.hasInstance](instance: unknown): boolean {
      if (!(instance instanceof ORPCError)) {
        return false
      }

      if (instance.code !== code) {
        return false
      }

      if (data) {
        const result = data['~standard'].validate(instance.data)

        if (result instanceof Promise) {
          throw new TypeError(
            `Cannot use \`instanceof\` with error factory "${code}": its data schema validates asynchronously is not supported.`,
          )
        }

        if (result.issues) {
          return false
        }
      }

      return true
    }
  }
}

export type ORPCErrorConstructorMapItemOptions<TData> = Omit<ORPCErrorOptions<TData>, 'status'>

export interface ORPCErrorConstructorMapItem<TCode extends ORPCErrorCode, TInData> {
  (...rest: MaybeOptionalOptions<ORPCErrorConstructorMapItemOptions<TInData>>): ORPCError<TCode, TInData>
}

export type ORPCErrorConstructorMap<T extends ErrorMap> = {
  [K in keyof T]: T[K] extends ErrorMapItem
    ? ORPCErrorConstructorMapItem<
       K & ORPCErrorCode,
       T[K]['data'] extends AnySchema ? InferSchemaInput<T[K]['data']> : unknown
    >
    : never
}

/**
 * Creates a map of ORPC error constructors.
 *
 * The returned object is a `Proxy` that allows access to arbitrary error codes:
 * - If the code exists in the provided `errorMap`, the corresponding constructor
 *   will create a **defined** `ORPCError`.
 * - If the code does not exist, a fallback `ORPCError` constructor is returned.
 *
 * The `in` operator can be used to check whether an error code is explicitly
 * defined in the map.
 *
 * @example
 * ```ts
 * const errorMap = createORPCErrorConstructorMap({
 *   NOT_FOUND: {
 *     message: 'Not Found',
 *   },
 * })
 *
 * throw errorMap.NOT_FOUND()
 * ```
 */
export function createORPCErrorConstructorMap<T extends ErrorMap>(errorMap: T): ORPCErrorConstructorMap<T> {
  const proxy = new Proxy(errorMap, {
    get(target, code) {
      if (typeof code !== 'string') {
        return Reflect.get(target, code)
      }

      const item: ORPCErrorConstructorMapItem<string, unknown> = (...rest) => {
        const options = resolveMaybeOptionalOptions(rest)
        const config = errorMap[code]

        const error = new ORPCError(code, {
          message: options.message ?? config?.message,
          data: options.data,
          cause: options.cause,
        })

        if (config) {
          ;(error.defined as Writable<typeof error.defined>) = true
          ;(error.inferable as Writable<typeof error.inferable>) = true
        }

        return error
      }

      return item
    },
  })

  return proxy as any
}
