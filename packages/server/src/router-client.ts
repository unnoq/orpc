import type { Hooks, Value } from '@orpc/shared'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { CreateProcedureClientRest, ProcedureClient } from './procedure-client'
import type { Meta } from './types'
import { isLazy } from './lazy'
import { createLazyProcedureFormAnyLazy } from './lazy-utils'
import { isProcedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { type ANY_ROUTER, getRouterChild, type Router } from './router'

/**
 * FIXME: separate RouterClient and ContractRouterClient, don't mix them
 */
export type RouterClient<TRouter extends ANY_ROUTER, TClientContext> = TRouter extends Lazy<infer U extends ANY_ROUTER>
  ? RouterClient<U, TClientContext>
  : TRouter extends Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput, infer UErrorMap, any>
    ? ProcedureClient<TClientContext, UInputSchema, UOutputSchema, UFuncOutput, UErrorMap>
    : {
        [K in keyof TRouter]: TRouter[K] extends ANY_ROUTER ? RouterClient<TRouter[K], TClientContext> : never
      }

export type CreateRouterClientOptions<TRouter extends ANY_ROUTER> =
  & {
    /**
     * This is helpful for logging and analytics.
     *
     * @internal
     */
    path?: string[]
  }
  & (TRouter extends Router<infer UContext, any>
    ? undefined extends UContext ? { context?: Value<UContext> } : { context: Value<UContext> }
    : never)
  & Hooks<unknown, unknown, TRouter extends Router<infer UContext, any> ? UContext : never, Meta>

export function createRouterClient<
  TRouter extends ANY_ROUTER,
  TClientContext,
>(
  router: TRouter | Lazy<undefined>,
  ...rest: CreateProcedureClientRest<TRouter extends Router<infer UContext, any> ? UContext : never, undefined, unknown, TClientContext>
): RouterClient<TRouter, TClientContext> {
  if (isProcedure(router)) {
    const caller = createProcedureClient(router, ...rest)

    return caller as any
  }

  const procedureCaller = isLazy(router)
    ? createProcedureClient(createLazyProcedureFormAnyLazy(router), ...rest)
    : {}

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouterChild(router, key)

      if (!next) {
        return Reflect.get(target, key)
      }

      const [options] = rest as any

      return createRouterClient(next, {
        ...options,
        path: [...(options?.path ?? []), key],
      })
    },
  })

  return recursive as any
}
