import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardRPCHandlerOptions } from '../standard'
import type { AwsLambdaHandlerOptions } from './handler'
import { StrictGetMethodPlugin } from '../../plugins'
import { StandardRPCHandler } from '../standard'
import { AwsLambdaHandler } from './handler'

export type RPCHandlerOptions<T extends Context> = AwsLambdaHandlerOptions & StandardRPCHandlerOptions<T> & {
  /**
   * Enables or disables the StrictGetMethodPlugin.
   *
   * @default true
   */
  strictGetMethodPluginEnabled?: boolean
}

/**
 * RPC Handler for AWS Lambda.
 *
 * @see {@link https://orpc.dev/docs/rpc-handler RPC Handler Docs}
 * @see {@link https://orpc.dev/docs/adapters/http HTTP Adapter Docs}
 */
export class RPCHandler<T extends Context> extends AwsLambdaHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<RPCHandlerOptions<T>> = {}) {
    if (options.strictGetMethodPluginEnabled ?? true) {
      options.plugins ??= []
      options.plugins.push(new StrictGetMethodPlugin())
    }

    super(new StandardRPCHandler(router, options), options)
  }
}
