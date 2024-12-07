import { ZodError, type ZodIssue } from 'zod'

export const ORPC_ERROR_CODE_STATUSES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405,
  NOT_ACCEPTABLE: 406,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

export type ORPCErrorCode = keyof typeof ORPC_ERROR_CODE_STATUSES

export interface ORPCErrorJSON<TCode extends ORPCErrorCode, TData> {
  code: TCode
  status: number
  message: string
  data: TData
  issues?: ZodIssue[]
}

export type ANY_ORPC_ERROR_JSON = ORPCErrorJSON<any, any>
export type WELL_ORPC_ERROR_JSON = ORPCErrorJSON<ORPCErrorCode, unknown>

export class ORPCError<TCode extends ORPCErrorCode, TData> extends Error {
  constructor(
    public zz$oe: {
      code: TCode
      status?: number
      message?: string
      cause?: unknown
    } & (undefined extends TData ? { data?: TData } : { data: TData }),
  ) {
    if (zz$oe.status && (zz$oe.status < 400 || zz$oe.status >= 600)) {
      throw new Error('The ORPCError status code must be in the 400-599 range.')
    }

    super(zz$oe.message, { cause: zz$oe.cause })
  }

  get code(): TCode {
    return this.zz$oe.code
  }

  get status(): number {
    return this.zz$oe.status ?? ORPC_ERROR_CODE_STATUSES[this.code]
  }

  get data(): TData {
    return this.zz$oe.data as TData
  }

  get issues(): ZodIssue[] | undefined {
    if (this.code === 'BAD_REQUEST' && this.zz$oe.cause instanceof ZodError) {
      return this.zz$oe.cause.issues
    }

    return undefined
  }

  toJSON(): ORPCErrorJSON<TCode, TData> {
    return {
      code: this.code,
      status: this.status,
      message: this.message,
      data: this.data,
      issues: this.issues,
    }
  }

  static fromJSON(json: unknown): ORPCError<ORPCErrorCode, any> | undefined {
    if (
      typeof json !== 'object'
      || json === null
      || !('code' in json)
      || !Object.keys(ORPC_ERROR_CODE_STATUSES).find(key => json.code === key)
      || !('status' in json)
      || typeof json.status !== 'number'
      || ('message' in json
        && json.message !== undefined
        && typeof json.message !== 'string')
      || ('issues' in json
        && json.issues !== undefined
        && !Array.isArray(json.issues))
    ) {
      return undefined
    }

    return new ORPCError({
      code: json.code as ORPCErrorCode,
      status: json.status as number,
      message: Reflect.get(json, 'message') as string,
      data: Reflect.get(json, 'data') as any,
      cause: 'issues' in json ? new ZodError(json.issues as any) : undefined,
    })
  }
}

export type WELL_ORPC_ERROR = ORPCError<ORPCErrorCode, unknown>
