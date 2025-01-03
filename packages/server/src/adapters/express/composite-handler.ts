import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '../../types'
import type { ConditionalRequestHandler, RequestHandler, RequestOptions } from './types'

export class CompositeHandler<T extends Context> implements RequestHandler<T> {
  constructor(
    private readonly handlers: ConditionalRequestHandler<T>[],
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse, ...opt: [options: RequestOptions<T>] | (undefined extends T ? [] : never)): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.condition(req)) {
        return handler.handle(req, res, ...opt)
      }
    }

    res.statusCode = 404
  }
}
