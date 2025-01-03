import type { ConditionalRequestHandler, RequestHandler, RequestOptions } from '@orpc/server/node'
import type { NextFunction, Request, Response } from 'express'
import type { Context } from '../../types'
import { CompositeHandler } from '@orpc/server/node'

export function expressAdapter<T extends Context>(
  handlers: (ConditionalRequestHandler<T> | RequestHandler<T>)[],
  options?: Partial<RequestOptions<T>>,
) {
  const compositeHandler = new CompositeHandler(handlers as ConditionalRequestHandler<T>[])

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      compositeHandler.handle(req, res, ...(options ? [options as RequestOptions<T>] : [undefined as any]))

      if (res.statusCode === 404) {
        next()
      }
    }
    catch (error) {
      next(error)
    }
  }
}
