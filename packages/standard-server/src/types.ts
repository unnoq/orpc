export interface StandardHeaders {
  [key: string]: string | string[] | undefined
}

export type StandardBody =
  | undefined
  | unknown
  | Blob
  | URLSearchParams
  | FormData
  | AsyncIterator<unknown | void, unknown | void, undefined>

export interface StandardRequest {
  method: string
  url: URL
  headers: StandardHeaders

  /**
   * The body has been parsed base on the content-type header.
   */
  body: StandardBody

  signal: AbortSignal | undefined
}

export interface StandardLazyRequest extends Omit<StandardRequest, 'body'> {
  /**
   * Can be { request: Request } or { request: IncomingMessage, response: ServerResponse } based on the adapter.
   */
  raw: Record<string, unknown>

  /**
   * The body has been parsed base on the content-type header.
   * This method can safely call multiple times (cached).
   */
  body: () => Promise<StandardBody>
}

export interface StandardResponse {
  status: number
  headers: StandardHeaders
  /**
   * The body has been parsed base on the content-type header.
   */
  body: StandardBody
}

export interface StandardLazyResponse extends Omit<StandardResponse, 'body'> {
  /**
   * Can be { request: Request } or { request: IncomingMessage, response: ServerResponse } based on the adapter.
   */
  raw: Record<string, unknown>

  /**
   * The body has been parsed base on the content-type header.
   * This method can safely call multiple times (cached).
   */
  body: () => Promise<StandardBody>
}
