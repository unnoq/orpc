import type { Context, Router } from '@orpc/server'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from '@orpc/server/node'
import type { StandardHandleOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { OpenAPIHandlerOptions } from '../standard'
import { StandardHandler } from '@orpc/server/standard'
import { sendStandardResponse, toStandardRequest } from '@orpc/standard-server-node'
import { OpenAPICodec, OpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<T, any>, options?: NoInfer<OpenAPIHandlerOptions<T>>) {
    const matcher = options?.matcher ?? new OpenAPIMatcher()
    const codec = options?.codec ?? new OpenAPICodec()

    this.standardHandler = new StandardHandler(router, matcher, codec, { ...options })
  }

  async handle(
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    ...rest: MaybeOptionalOptions<StandardHandleOptions<T>>
  ): Promise<NodeHttpHandleResult> {
    const standardRequest = toStandardRequest(req, res)

    const result = await this.standardHandler.handle(standardRequest, ...rest)

    if (!result.matched) {
      return { matched: false }
    }

    await sendStandardResponse(res, result.response, rest[0] ?? {})

    return { matched: true }
  }
}
