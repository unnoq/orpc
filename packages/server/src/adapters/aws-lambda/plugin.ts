import type { Context } from '../../context'
import type { StandardHandlerPlugin } from '../standard'
import type { AwsLambdaHandlerOptions } from './handler'
import { sortPlugins } from '@orpc/shared'

export interface AwsLambdaHandlerPlugin<T extends Context> extends StandardHandlerPlugin<T> {
  /**
   * Initializes the plugin and returns new AWS Lambda handler options.
   * Called once per plugin instance during composition.
   *
   * This method allows plugins to wrap, extend, or transform AWS Lambda handler options
   * such as interceptors, or other configuration.
   *
   * @param options - The current handler options from previous plugins or base configuration
   * @returns Transformed handler options with plugin's modifications applied
   *
   * @example
   * ```ts
   * initAwsLambdaHandlerOptions(options) {
   *   return {
   *     ...options,
   *     awsLambdaInterceptors: [...(options.awsLambdaInterceptors || []), myInterceptor]
   *   }
   * }
   * ```
   */
  initAwsLambdaHandlerOptions?(options: AwsLambdaHandlerOptions<T>): AwsLambdaHandlerOptions<T>
}

export class CompositeAwsLambdaHandlerPlugin<T extends Context> implements AwsLambdaHandlerPlugin<T> {
  readonly name = '~composite/aws-lambda'

  protected readonly plugins: AwsLambdaHandlerPlugin<T>[]

  constructor(plugins: AwsLambdaHandlerPlugin<T>[] = []) {
    this.plugins = sortPlugins(plugins)
  }

  initAwsLambdaHandlerOptions(options: AwsLambdaHandlerOptions<T>): AwsLambdaHandlerOptions<T> {
    for (const plugin of this.plugins) {
      if (plugin.initAwsLambdaHandlerOptions) {
        options = plugin.initAwsLambdaHandlerOptions(options)
      }
    }

    return options
  }
}
