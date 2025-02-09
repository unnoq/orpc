import type { AnyContractRouter, ContractProcedure, ContractRouterToErrorMap, ContractRouterToMeta, ErrorMap } from '@orpc/contract'
import type { ConflictContextGuard, Context, MergedContext } from './context'
import type { ProcedureImplementer } from './implementer-procedure'
import type { FlattenLazy } from './lazy-utils'
import type { Middleware } from './middleware'
import type { AdaptedRouter, Router } from './router'

export interface RouterImplementerWithMiddlewares<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> {
  use<U extends Context, UErrorMap extends ErrorMap = ContractRouterToErrorMap<TContract>>(
    middleware: Middleware<
      TCurrentContext,
      U,
      unknown,
      unknown,
      UErrorMap,
      ContractRouterToMeta<TContract>
    >,
  ): ConflictContextGuard<MergedContext<TCurrentContext, U>>
    & ImplementerInternalWithMiddlewares<TContract, TInitialContext, MergedContext<TCurrentContext, U>>

  router<U extends Router<TCurrentContext, TContract>>(router: U): AdaptedRouter<U, TInitialContext, Record<never, never>>

  lazy<U extends Router<TInitialContext, TContract>>(
    loader: () => Promise<{ default: U }>
  ): AdaptedRouter<FlattenLazy<U>, TInitialContext, Record<never, never>>
}

export type ImplementerInternalWithMiddlewares<
  TContract extends AnyContractRouter,
  TInitialContext extends Context,
  TCurrentContext extends Context,
> =
  &(
    TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer UMeta>
      ? ProcedureImplementer<TInitialContext, TCurrentContext, UInputSchema, UOutputSchema, UErrorMap, UMeta>
      : RouterImplementerWithMiddlewares<TContract, TInitialContext, TCurrentContext> & {
        [K in keyof TContract]: TContract[K] extends AnyContractRouter
          ? ImplementerInternalWithMiddlewares<TContract[K], TInitialContext, TCurrentContext>
          : never
      }
   )
