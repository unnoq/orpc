import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, Value } from '@orpc/shared'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { Caller, Meta } from './types'
import { isLazy, lazy, unlazy } from './lazy'
import { isProcedure } from './procedure'
import { createProcedureCaller } from './procedure-caller'
import { type ANY_ROUTER, getRouterChild, type Router } from './router'

export type RouterCaller<T extends ANY_ROUTER> = T extends Lazy<infer U extends ANY_ROUTER>
  ? RouterCaller<U>
  : T extends Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
    ? Caller<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
    : {
        [K in keyof T]: T[K] extends ANY_ROUTER ? RouterCaller<T[K]> : never
      }

export type CreateRouterCallerOptions<
  TRouter extends ANY_ROUTER,
> =
  & {
    router: TRouter | Lazy<undefined>

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

export function createRouterCaller<
  TRouter extends ANY_ROUTER,
>(
  options: CreateRouterCallerOptions<TRouter>,
): RouterCaller<TRouter> {
  if (isProcedure(options.router)) {
    const caller = createProcedureCaller({
      ...options,
      procedure: options.router,
      context: options.context,
      path: options.path,
    })

    return caller as any
  }

  const procedureCaller = isLazy(options.router)
    ? createProcedureCaller({
      ...options,
      procedure: lazy(async () => {
        const { default: maybeProcedure } = await unlazy(options.router)

        if (!isProcedure(maybeProcedure)) {
          throw new Error(`
            Expected a valid procedure or lazy<procedure> but got unknown.
            This should be caught by TypeScript compilation.
            Please report this issue if this makes you feel uncomfortable.
          `)
        }

        return { default: maybeProcedure }
      }),
      context: options.context,
      path: options.path,
    })
    : {}

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouterChild(options.router, key)

      if (!next) {
        return Reflect.get(target, key)
      }

      return createRouterCaller({
        ...options,
        router: next,
        path: [...(options.path ?? []), key],
      })
    },
  })

  return recursive as any
}
