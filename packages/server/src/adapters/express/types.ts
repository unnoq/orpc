/// <reference types="node" />

import type { RequestOptions as BaseRequestOptions } from '@mjackson/node-fetch-server'
import type { HTTPPath } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context, WithSignal } from '../../types'

export type RequestOptions<T extends Context> =
  & BaseRequestOptions
  & WithSignal
  & { prefix?: HTTPPath }
  & (undefined extends T ? { context?: T } : { context: T })
  & {
    beforeSend?: (response: Response, context: T) => Promisable<void>
  }

export interface RequestHandler<T extends Context> {
  handle: (req: IncomingMessage, res: ServerResponse, ...opt: [options: RequestOptions<T>] | (undefined extends T ? [] : never)) => void
}

export interface ConditionalRequestHandler<T extends Context> extends RequestHandler<T> {
  condition: (request: IncomingMessage) => boolean
}
