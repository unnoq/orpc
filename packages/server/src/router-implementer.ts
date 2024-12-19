import type { ContractRouter } from '@orpc/contract'
import type { FlattenLazy } from './lazy'
import type { Middleware } from './middleware'
import type { Router } from './router'
import type { AdaptedRouter } from './router-builder'
import type { Context, MergeContext } from './types'
import { setRouterContract } from './hidden'
import { RouterBuilder } from './router-builder'

export interface RouterImplementerDef<
  TContext extends Context,
  TExtraContext extends Context,
  TContract extends ContractRouter,
> {
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any>[]
  contract: TContract
}

export class RouterImplementer<
  TContext extends Context,
  TExtraContext extends Context,
  TContract extends ContractRouter,
> {
  '~type' = 'RouterImplementer' as const
  '~orpc': RouterImplementerDef<TContext, TExtraContext, TContract>

  constructor(def: RouterImplementerDef<TContext, TExtraContext, TContract>) {
    this['~orpc'] = def
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown
    >,
  ): RouterImplementer<TContext, MergeContext<TExtraContext, U>, TContract> {
    return new RouterImplementer({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), middleware as any],
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, TContract>>(
    router: U,
  ): AdaptedRouter<TContext, U> {
    const adapted = new RouterBuilder(this['~orpc']).router(router)

    const contracted = setRouterContract(adapted, this['~orpc'].contract)

    return contracted
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, TContract>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>> {
    const adapted = new RouterBuilder(this['~orpc']).lazy(loader)

    const contracted = setRouterContract(adapted, this['~orpc'].contract)

    return contracted
  }
}
