import type { Middleware } from './middleware'
import type { Context, MergeContext, WELL_CONTEXT } from './types'
import { type ContractProcedure, type ContractRouter, isContractProcedure } from '@orpc/contract'
import { createCallableObject } from '@orpc/shared'
import { ProcedureImplementer } from './procedure-implementer'
import { RouterImplementer } from './router-implementer'

export type ChainableImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TContract extends ContractRouter<any>,
> = TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap>
  ? ProcedureImplementer<TContext, TExtraContext, UInputSchema, UOutputSchema, UErrorMap>
  : {
    [K in keyof TContract]: TContract[K] extends ContractRouter<any> ? ChainableImplementer<TContext, TExtraContext, TContract[K]> : never
  } & Omit<RouterImplementer<TContext, TExtraContext, TContract>, '~type' | '~orpc'>

export function createChainableImplementer<
  TContext extends Context = WELL_CONTEXT,
  TExtraContext extends Context = undefined,
  TContract extends ContractRouter<any> = any,
>(
  contract: TContract,
  options: {
    middlewares: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any, any>[]
    inputValidationIndex: number
    outputValidationIndex: number
  },
): ChainableImplementer<TContext, TExtraContext, TContract> {
  if (isContractProcedure(contract)) {
    const implementer = new ProcedureImplementer({
      contract,
      middlewares: options.middlewares,
      inputValidationIndex: options.inputValidationIndex,
      outputValidationIndex: options.outputValidationIndex,
    })

    return implementer as any
  }

  const chainable = {} as ChainableImplementer<TContext, TExtraContext, TContract>

  for (const key in contract) {
    (chainable as any)[key] = createChainableImplementer(contract[key]!, options)
  }

  const routerImplementer = new RouterImplementer({
    contract,
    middlewares: options.middlewares,
  })

  const merged = new Proxy(chainable, {
    get(target, key) {
      const next = Reflect.get(target, key) as ChainableImplementer<TContext, TExtraContext, TContract> | undefined
      const method = Reflect.get(routerImplementer, key)

      if (typeof key !== 'string' || typeof method !== 'function') {
        return next
      }

      if (!next) {
        return method.bind(routerImplementer)
      }

      return createCallableObject(next, method.bind(routerImplementer))
    },
  })

  return merged as any
}
