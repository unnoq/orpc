import type { ClientContext } from '@orpc/client'
import type { StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { AnyContractRouter } from '../router'
import { ORPCError } from '@orpc/client'
import { get } from '@orpc/shared'
import { ValidationError } from '../error'
import { isContractProcedure } from '../procedure'

export class RequestValidationPluginError extends Error {}

/**
 * A link plugin that validates client requests against your contract schema,
 * ensuring that data sent to your server matches the expected types defined in your contract.
 *
 * @throws {ORPCError} with code `BAD_REQUEST` (same as server side) if input doesn't match the expected schema
 * @see {@link https://orpc.dev/docs/plugins/request-validation Request Validation Plugin Docs}
 */
export class RequestValidationPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  constructor(
    private readonly contract: AnyContractRouter,
  ) {}

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []

    options.interceptors.push(async ({ next, path, input }) => {
      const procedure = get(this.contract, path)

      if (!isContractProcedure(procedure)) {
        throw new RequestValidationPluginError(`No valid procedure found at path "${path.join('.')}", this may happen when the contract router is not properly configured.`)
      }

      const inputSchema = procedure['~orpc'].inputSchema

      if (inputSchema) {
        const result = await inputSchema['~standard'].validate(input)

        if (result.issues) {
          /**
           * This error should be same as server side when input validation fails.
           */
          throw new ORPCError('BAD_REQUEST', {
            message: 'Input validation failed',
            data: {
              issues: result.issues,
            },
            cause: new ValidationError({
              message: 'Input validation failed',
              issues: result.issues,
              data: input,
            }),
          })
        }
      }

      /**
       * we should not use validated input here,
       * because validated input maybe is transformed by schema
       * leading input no longer matching expected schema
       */
      return await next()
    })
  }
}
