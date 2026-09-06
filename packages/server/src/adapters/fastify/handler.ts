import type { Interceptor, MaybeOptionalOptions } from '@orpc/shared'
import type { AnyFastifyReply, AnyFastifyRequest, SendStandardResponseOptions } from '@standard-server/fastify'
import type { Context } from '../../context'
import type { FriendlyStandardHandlerHandleOptions, StandardHandler, StandardHandlerHandleOptions } from '../standard'
import type { FastifyHandlerPlugin } from './plugin'
import { intercept, resolveMaybeOptionalOptions } from '@orpc/shared'
import { sendStandardResponse, toStandardLazyRequest } from '@standard-server/fastify'
import { resolveFriendlyStandardHandlerHandleOptions } from '../standard'
import { CompositeFastifyHandlerPlugin } from './plugin'

export type FastifyHandlerHandleResult = { matched: true } | { matched: false }

export interface FastifyHandlerFastifyInterceptorOptions<T extends Context> extends StandardHandlerHandleOptions<T> {
  request: AnyFastifyRequest
  reply: AnyFastifyReply
  sendStandardResponseOptions: SendStandardResponseOptions | undefined
}
export type FastifyHandlerFastifyInterceptor<T extends Context> = Interceptor<FastifyHandlerFastifyInterceptorOptions<T>, Promise<FastifyHandlerHandleResult>>

export interface FastifyHandlerOptions<T extends Context> {
  /**
   * Custom options for `sendStandardResponse`, used to send a `Standard Response`
   */
  sendStandardResponse?: SendStandardResponseOptions | undefined

  /**
   * Interceptors that run before the mapping between the Standard API and Fastify API,
   * useful for extending the Fastify request/reply before handling, ...
   */
  fastifyInterceptors?: FastifyHandlerFastifyInterceptor<T>[] | undefined

  plugins?: FastifyHandlerPlugin<T>[] | undefined
}

export class FastifyHandler<T extends Context> {
  private readonly sendStandardResponseOptions: FastifyHandlerOptions<T>['sendStandardResponse']
  private readonly fastifyInterceptors: FastifyHandlerOptions<T>['fastifyInterceptors']

  constructor(
    private readonly standardHandler: StandardHandler<T>,
    options: NoInfer<FastifyHandlerOptions<T>> = {},
  ) {
    options = new CompositeFastifyHandlerPlugin(options.plugins).initFastifyHandlerOptions(options)

    this.fastifyInterceptors = options.fastifyInterceptors
    this.sendStandardResponseOptions = options.sendStandardResponse
  }

  async handle(
    request: AnyFastifyRequest,
    reply: AnyFastifyReply,
    ...rest: MaybeOptionalOptions<FriendlyStandardHandlerHandleOptions<T>>
  ): Promise<FastifyHandlerHandleResult> {
    return intercept(
      this.fastifyInterceptors,
      {
        ...resolveFriendlyStandardHandlerHandleOptions(resolveMaybeOptionalOptions(rest)),
        request,
        reply,
        sendStandardResponseOptions: this.sendStandardResponseOptions,
      },
      async ({ request, reply, sendStandardResponseOptions, ...options }) => {
        const standardRequest = toStandardLazyRequest(request, reply)

        const result = await this.standardHandler.handle(standardRequest, options)

        if (!result.matched) {
          return result
        }

        await sendStandardResponse(reply, result.response, sendStandardResponseOptions)

        return result
      },
    )
  }
}
