import type { ClientContext } from '@orpc/client'
import type { StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { AnyContractRouter } from '../router'
import { ORPCError } from '@orpc/client'
import { get } from '@orpc/shared'
import { validateORPCError, ValidationError } from '../error'
import { isContractProcedure } from '../procedure'

/**
 * A link plugin that validates server responses against your contract schema,
 * ensuring that data returned from your server matches the expected types defined in your contract.
 *
 * - Throws `ValidationError` if output doesn't match the expected schema
 * - Converts mismatched defined errors to normal `ORPCError` instances
 *
 * @see {@link https://orpc.dev/docs/plugins/response-validation Response Validation Plugin Docs}
 */
export class ResponseValidationPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  constructor(
    private readonly contract: AnyContractRouter,
  ) {}

  /**
   * run before (validate after) retry plugin, because validation failed can't be retried
   * run before (validate after) durable iterator plugin, because we expect durable iterator to validation (if user use it)
   */
  order = 1_200_000

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []

    options.interceptors.push(async ({ next, path }) => {
      const procedure = get(this.contract, path)

      if (!isContractProcedure(procedure)) {
        throw new Error(`[ResponseValidationPlugin] no valid procedure found at path "${path.join('.')}", this may happen when the contract router is not properly configured.`)
      }

      try {
        const output = await next()
        const outputSchema = procedure['~orpc'].outputSchema

        if (!outputSchema) {
          return output
        }

        const result = await outputSchema['~standard'].validate(output)

        if (result.issues) {
          throw new ValidationError({
            message: 'Server response output does not match expected schema',
            issues: result.issues,
            data: output,
          })
        }

        return result.value
      }
      catch (e) {
        if (e instanceof ORPCError) {
          throw await validateORPCError(procedure['~orpc'].errorMap, e)
        }

        throw e
      }
    })
  }
}
