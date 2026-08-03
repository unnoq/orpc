import type { Context, Router } from '@orpc/server'
import type { FastifyHandlerOptions } from '@orpc/server/fastify'
import type { StandardHandlerOptions } from '@orpc/server/standard'
import type { OpenAPIHandlerCodecOptions } from '../standard'
import { FastifyHandler } from '@orpc/server/fastify'
import { StandardHandler } from '@orpc/server/standard'
import { OpenAPIHandlerCodec } from '../standard'

export interface OpenAPIHandlerOptions<T extends Context>
  extends FastifyHandlerOptions<T>, Omit<StandardHandlerOptions<T>, 'plugins'>, OpenAPIHandlerCodecOptions<T> {}

export class OpenAPIHandler<T extends Context> extends FastifyHandler<T> {
  constructor(
    router: Router<T>,
    options: NoInfer<OpenAPIHandlerOptions<T>> = {},
  ) {
    const codec = new OpenAPIHandlerCodec(router, options)
    const handler = new StandardHandler(codec, options)
    super(handler, options)
  }
}
