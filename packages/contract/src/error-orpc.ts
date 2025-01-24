import type { ErrorMap, ErrorMapItem } from './error-map'
import type { SchemaOutput } from './schema'
import { isPlainObject } from '@orpc/shared'

export type ORPCErrorFromErrorMap<TErrorMap extends ErrorMap> = {
  [K in keyof TErrorMap]: K extends string
    ? TErrorMap[K] extends ErrorMapItem<infer TDataSchema>
      ? ORPCError<K, SchemaOutput<TDataSchema>>
      : never
    : never
}[keyof TErrorMap]

export const COMMON_ORPC_ERROR_DEFS = {
  BAD_REQUEST: {
    status: 400,
    message: 'Bad Request',
  },
  UNAUTHORIZED: {
    status: 401,
    message: 'Unauthorized',
  },
  FORBIDDEN: {
    status: 403,
    message: 'Forbidden',
  },
  NOT_FOUND: {
    status: 404,
    message: 'Not Found',
  },
  METHOD_NOT_SUPPORTED: {
    status: 405,
    message: 'Method Not Supported',
  },
  NOT_ACCEPTABLE: {
    status: 406,
    message: 'Not Acceptable',
  },
  TIMEOUT: {
    status: 408,
    message: 'Request Timeout',
  },
  CONFLICT: {
    status: 409,
    message: 'Conflict',
  },
  PRECONDITION_FAILED: {
    status: 412,
    message: 'Precondition Failed',
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    message: 'Payload Too Large',
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    message: 'Unsupported Media Type',
  },
  UNPROCESSABLE_CONTENT: {
    status: 422,
    message: 'Unprocessable Content',
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    message: 'Too Many Requests',
  },
  CLIENT_CLOSED_REQUEST: {
    status: 499,
    message: 'Client Closed Request',
  },

  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: 'Internal Server Error',
  },
  NOT_IMPLEMENTED: {
    status: 501,
    message: 'Not Implemented',
  },
  BAD_GATEWAY: {
    status: 502,
    message: 'Bad Gateway',
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: 'Service Unavailable',
  },
  GATEWAY_TIMEOUT: {
    status: 504,
    message: 'Gateway Timeout',
  },
} as const

export type CommonORPCErrorCode = keyof typeof COMMON_ORPC_ERROR_DEFS

export type ORPCErrorCode = CommonORPCErrorCode | (string & {})

export function fallbackORPCErrorStatus(code: ORPCErrorCode, status: number | undefined): number {
  return status ?? (COMMON_ORPC_ERROR_DEFS as any)[code]?.status ?? 500
}

export function fallbackORPCErrorMessage(code: ORPCErrorCode, message: string | undefined): string {
  return message || (COMMON_ORPC_ERROR_DEFS as any)[code]?.message || code
}

export type ORPCErrorOptions< TData> =
  & ErrorOptions
  & { defined?: boolean, status?: number, message?: string }
  & (undefined extends TData ? { data?: TData } : { data: TData })

export type ORPCErrorOptionsRest<TData> =
  | [options: ORPCErrorOptions<TData>]
  | (undefined extends TData ? [] : never)

export class ORPCError<TCode extends ORPCErrorCode, TData> extends Error {
  readonly defined: boolean
  readonly code: TCode
  readonly status: number
  readonly data: TData

  constructor(code: TCode, ...[options]: ORPCErrorOptionsRest<TData>) {
    if (options?.status && (options.status < 400 || options.status >= 600)) {
      throw new Error('[ORPCError] The error status code must be in the 400-599 range.')
    }

    const message = fallbackORPCErrorMessage(code, options?.message)

    super(message, options)

    this.code = code
    this.status = fallbackORPCErrorStatus(code, options?.status)
    this.defined = options?.defined ?? false
    this.data = options?.data as TData // data only optional when TData is undefinable so can safely cast here
  }

  toJSON(): ORPCErrorJSON<TCode, TData> {
    return {
      defined: this.defined,
      code: this.code,
      status: this.status,
      message: this.message,
      data: this.data,
    }
  }

  fromJSON<TCode extends ORPCErrorCode, TData>(json: ORPCErrorJSON<TCode, TData>): ORPCError<TCode, TData> {
    return new ORPCError(json.code, json)
  }

  static isValidJSON(json: unknown): json is ORPCErrorJSON<string, unknown> {
    return isPlainObject(json)
      && 'defined' in json
      && typeof json.defined === 'boolean'
      && 'code' in json
      && typeof json.code === 'string'
      && 'status' in json
      && typeof json.status === 'number'
      && 'message' in json
      && typeof json.message === 'string'
  }
}

export type ORPCErrorJSON<TCode extends string, TData> = Pick<ORPCError<TCode, TData>, 'defined' | 'code' | 'status' | 'message' | 'data'>
