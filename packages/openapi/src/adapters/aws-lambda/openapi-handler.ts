import type { Context, Router } from '@orpc/server'
import type { AwsLambdaHandlerOptions } from '@orpc/server/aws-lambda'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { AwsLambdaHandler } from '@orpc/server/aws-lambda'
import { StandardOpenAPIHandler } from '../standard'

/**
 * OpenAPI Handler for AWS Lambda.
 *
 * @see {@link https://orpc.dev/docs/openapi/openapi-handler OpenAPI Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/http HTTP Adapter Docs}
 */
export class OpenAPIHandler<T extends Context> extends AwsLambdaHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T> & AwsLambdaHandlerOptions> = {}) {
    super(new StandardOpenAPIHandler(router, options), options)
  }
}
