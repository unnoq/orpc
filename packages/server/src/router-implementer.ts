import type { DecoratedLazy } from './lazy'
import type { Middleware } from './middleware'
import type { HandledRouter, RouterWithContract } from './router'
import type { Context } from './types'
import { type ContractProcedure, type ContractRouter, isContractProcedure } from '@orpc/contract'
import { createLazy, decorateLazy } from './lazy'
import { ProcedureImplementer } from './procedure-implementer'
import { RouterBuilder } from './router-builder'

export const ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_ROUTER_CONTRACT')

export class RouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter,
> {
  constructor(
    public zz$ri: {
      contract: TContract
    },
  ) {}

  router<U extends RouterWithContract<TContext, TContract>>(
    router: U,
  ): HandledRouter<U> {
    return Object.assign(new RouterBuilder<TContext, undefined>({}).router(router), {
      [ROUTER_CONTRACT_SYMBOL]: this.zz$ri.contract,
    })
  }

  lazy<U extends RouterWithContract<TContext, TContract>>(
    loader: () => Promise<{ default: U }>,
  ): DecoratedLazy<U> {
    const lazy = createLazy(loader)
    const decorated = decorateLazy(lazy)

    return Object.assign(decorated, {
      [ROUTER_CONTRACT_SYMBOL]: this.zz$ri.contract,
    })
  }
}

export type ChainedRouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter,
  TExtraContext extends Context,
> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<
    infer UInputSchema,
    infer UOutputSchema
  >
    ? ProcedureImplementer<TContext, TExtraContext, UInputSchema, UOutputSchema>
    : TContract[K] extends ContractRouter
      ? ChainedRouterImplementer<TContext, TContract[K], TExtraContext>
      : never
} & RouterImplementer<TContext, TContract>

export function chainRouterImplementer<
  TContext extends Context,
  TContract extends ContractRouter,
  TExtraContext extends Context,
>(
  contract: TContract,
  middlewares?: Middleware<any, any, any, any>[],
): ChainedRouterImplementer<TContext, TContract, TExtraContext> {
  const result: Record<string, unknown> = {}

  for (const key in contract) {
    const item = contract[key]

    if (isContractProcedure(item)) {
      result[key] = new ProcedureImplementer({
        contract: item,
        middlewares,
      })
    }
    else {
      result[key] = chainRouterImplementer(item as ContractRouter, middlewares)
    }
  }

  const implementer = new RouterImplementer({ contract })

  return Object.assign(implementer, result) as any
}
