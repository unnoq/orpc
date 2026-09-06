import type { Interceptor, MaybeOptionalOptions } from '@orpc/shared'
import type { AnyAPIGatewayProxyEvent, HttpResponseStream, SendStandardResponseOptions } from '@standard-server/aws-lambda'
import type { Context } from '../../context'
import type { FriendlyStandardHandlerHandleOptions, StandardHandler, StandardHandlerHandleOptions } from '../standard'
import type { AwsLambdaHandlerPlugin } from './plugin'
import { intercept, resolveMaybeOptionalOptions } from '@orpc/shared'
import { sendStandardResponse, toStandardLazyRequest } from '@standard-server/aws-lambda'
import { resolveFriendlyStandardHandlerHandleOptions } from '../standard'
import { CompositeAwsLambdaHandlerPlugin } from './plugin'

export type AwsLambdaHandlerHandleResult = { matched: true } | { matched: false }

export interface AwsLambdaHandlerAwsLambdaInterceptorOptions<T extends Context> extends StandardHandlerHandleOptions<T> {
  event: AnyAPIGatewayProxyEvent
  responseStream: HttpResponseStream
  sendStandardResponseOptions: SendStandardResponseOptions | undefined
}
export type AwsLambdaHandlerAwsLambdaInterceptor<T extends Context> = Interceptor<AwsLambdaHandlerAwsLambdaInterceptorOptions<T>, Promise<AwsLambdaHandlerHandleResult>>

export interface AwsLambdaHandlerOptions<T extends Context> {
  /**
   * Custom options for `sendStandardResponse`, used to send a `Standard Response`
   */
  sendStandardResponse?: SendStandardResponseOptions | undefined

  /**
   * Interceptors that run before the mapping between the Standard API and AWS Lambda API,
   * useful for extending the AWS Lambda event/response stream before handling, ...
   */
  awsLambdaInterceptors?: AwsLambdaHandlerAwsLambdaInterceptor<T>[] | undefined

  plugins?: AwsLambdaHandlerPlugin<T>[] | undefined
}

/**
 * Requires the AWS Lambda Node.js runtime with response streaming enabled,
 * handlers should be wrapped with `awslambda.streamifyResponse`.
 */
export class AwsLambdaHandler<T extends Context> {
  private readonly sendStandardResponseOptions: AwsLambdaHandlerOptions<T>['sendStandardResponse']
  private readonly awsLambdaInterceptors: AwsLambdaHandlerOptions<T>['awsLambdaInterceptors']

  constructor(
    private readonly standardHandler: StandardHandler<T>,
    options: NoInfer<AwsLambdaHandlerOptions<T>> = {},
  ) {
    options = new CompositeAwsLambdaHandlerPlugin(options.plugins).initAwsLambdaHandlerOptions(options)

    this.awsLambdaInterceptors = options.awsLambdaInterceptors
    this.sendStandardResponseOptions = options.sendStandardResponse
  }

  async handle(
    event: AnyAPIGatewayProxyEvent,
    responseStream: HttpResponseStream,
    ...rest: MaybeOptionalOptions<FriendlyStandardHandlerHandleOptions<T>>
  ): Promise<AwsLambdaHandlerHandleResult> {
    return intercept(
      this.awsLambdaInterceptors,
      {
        ...resolveFriendlyStandardHandlerHandleOptions(resolveMaybeOptionalOptions(rest)),
        event,
        responseStream,
        sendStandardResponseOptions: this.sendStandardResponseOptions,
      },
      async ({ event, responseStream, sendStandardResponseOptions, ...options }) => {
        const standardRequest = toStandardLazyRequest(event, responseStream)

        const result = await this.standardHandler.handle(standardRequest, options)

        if (!result.matched) {
          return result
        }

        await sendStandardResponse(responseStream, result.response, sendStandardResponseOptions)

        return result
      },
    )
  }
}
