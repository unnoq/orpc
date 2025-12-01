import type { HTTPMethod } from '@orpc/client'
import type { AnyContractRouter } from './router'
import { get } from '@orpc/shared'
import { fallbackContractConfig } from './config'
import { isContractProcedure } from './procedure'

/**
 * Help RPCLink automatically send requests using the specified HTTP method in the contract.
 *
 * @see {@link https://orpc.dev/docs/client/rpc-link#custom-request-method RPCLink Custom Request Method}
 */
export function inferRPCMethodFromContractRouter(contract: AnyContractRouter): (options: unknown, path: readonly string[]) => Exclude<HTTPMethod, 'HEAD'> {
  return (_, path) => {
    const procedure = get(contract, path)

    if (!isContractProcedure(procedure)) {
      throw new Error(
        `[inferRPCMethodFromContractRouter] No valid procedure found at path "${path.join('.')}". `
        + `This may happen when the contract router is not properly configured.`,
      )
    }

    const method = fallbackContractConfig('defaultMethod', procedure['~orpc'].route.method)

    return method === 'HEAD' ? 'GET' : method
  }
}
