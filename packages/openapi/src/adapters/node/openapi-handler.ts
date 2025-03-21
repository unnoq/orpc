import type { Context, Router } from '@orpc/server'
import type { NodeHttpHandler, NodeHttpHandleResult, NodeHttpRequest, NodeHttpResponse } from '@orpc/server/node'
import type { StandardHandleOptions } from '@orpc/server/standard'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { SendStandardResponseOptions } from '@orpc/standard-server-node'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { StandardBracketNotationSerializer, StandardOpenAPIJsonSerializer, StandardOpenAPISerializer } from '@orpc/openapi-client/standard'
import { StandardHandler } from '@orpc/server/standard'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import { StandardOpenAPICodec, StandardOpenAPIMatcher } from '../standard'

export class OpenAPIHandler<T extends Context> implements NodeHttpHandler<T> {
  private readonly standardHandler: StandardHandler<T>

  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T>> = {}) {
    const jsonSerializer = new StandardOpenAPIJsonSerializer(options)
    const bracketNotationSerializer = new StandardBracketNotationSerializer()
    const serializer = new StandardOpenAPISerializer(jsonSerializer, bracketNotationSerializer)
    const matcher = new StandardOpenAPIMatcher()
    const codec = new StandardOpenAPICodec(serializer)

    this.standardHandler = new StandardHandler(router, matcher, codec, options)
  }

  async handle(
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    ...[
      options = {} as StandardHandleOptions<T> & SendStandardResponseOptions,
    ]: MaybeOptionalOptions<StandardHandleOptions<T> & SendStandardResponseOptions>
  ): Promise<NodeHttpHandleResult> {
    const standardRequest = toStandardLazyRequest(req, res)

    const result = await this.standardHandler.handle(standardRequest, options)

    if (!result.matched) {
      return { matched: false }
    }

    await sendStandardResponse(res, result.response, options)

    return { matched: true }
  }
}
