import type { GeneralHook, Merge, Value } from '@orpc/shared'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE } from './procedure'
import type { Router } from './router'
import { isLazy } from './lazy'
import { isProcedure } from './procedure'
import { createProcedureCaller, type ProcedureCaller } from './procedure-caller'

export interface CreateRouterCallerOptions<
  TRouter extends Router<any>,
> extends GeneralHook<
    unknown,
    unknown,
    TRouter extends Router<infer UContext> ? UContext : never,
    { path: string[], procedure: ANY_PROCEDURE }
  > {
  router: TRouter

  /**
   * The context used when calling the procedure.
   */
  context: Value<
    TRouter extends Router<infer UContext> ? UContext : never
  >

  /**
   * This is helpful for logging and analytics.
   *
   * @internal
   */
  basePath?: string[]
}

export type RouterCaller<
  TRouter extends Router<any>,
> = {
  [K in keyof TRouter]: TRouter[K] extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE
    ? ProcedureCaller<TRouter[K]>
    : TRouter[K] extends Router<any>
      ? RouterCaller<TRouter[K]>
      : never
}

export function createRouterCaller<
  TRouter extends Router<any>,
>(
  options: CreateRouterCallerOptions<TRouter>,
): RouterCaller<TRouter> {
  return createRouterCallerInternal(options) as any
}

function createRouterCallerInternal(
  options: Merge<CreateRouterCallerOptions<Router<any>>, {
    router: Router<any> | Router<any>[keyof Router<any>]
  }>,
) {
  const procedureCaller = isLazy(options.router) || isProcedure(options.router)
    ? createProcedureCaller({
      ...options,
      procedure: options.router as any,
      context: options.context,
      path: options.basePath,
    })
    : {}

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = (options.router as any)[key]

      return createRouterCallerInternal({
        ...options,
        router: next,
        basePath: [...(options.basePath ?? []), key],
      })
    },
  })

  return recursive
}
