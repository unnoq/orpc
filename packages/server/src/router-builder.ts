import type { HTTPPath } from '@orpc/contract'
import type { FlattenLazy, Lazy } from './lazy'
import type { ANY_MIDDLEWARE, Middleware } from './middleware'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import type { ANY_ROUTER, Router } from './router'
import type { Context, MergeContext } from './types'
import { deepSetLazyRouterPrefix, getLazyRouterPrefix } from './hidden'
import { flatLazy, isLazy, lazy, unlazy } from './lazy'
import { type DecoratedLazy, decorateLazy } from './lazy-decorated'
import { isProcedure } from './procedure'
import { type DecoratedProcedure, decorateProcedure } from './procedure-decorated'

export type AdaptedRouter<
  TContext extends Context,
  TRouter extends ANY_ROUTER,
> = TRouter extends Lazy<infer U extends ANY_ROUTER>
  ? DecoratedLazy<AdaptedRouter<TContext, U>>
  : TRouter extends Procedure<any, infer UExtraContext, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
    ? DecoratedProcedure<TContext, UExtraContext, UInputSchema, UOutputSchema, UFuncOutput>
    : {
        [K in keyof TRouter]: TRouter[K] extends ANY_ROUTER ? AdaptedRouter<TContext, TRouter[K]> : never
      }

export type RouterBuilderDef<TContext extends Context, TExtraContext extends Context> = {
  prefix?: HTTPPath
  tags?: readonly string[]
  middlewares?: Middleware<MergeContext<TContext, TExtraContext>, Partial<TExtraContext> | undefined, unknown, any>[]
}

export class RouterBuilder<
  TContext extends Context,
  TExtraContext extends Context,
> {
  '~type' = 'RouterBuilder' as const
  '~orpc': RouterBuilderDef<TContext, TExtraContext>

  constructor(def: RouterBuilderDef<TContext, TExtraContext>) {
    this['~orpc'] = def

    if (def.prefix && def.prefix.includes('{')) {
      throw new Error(`
        Dynamic routing in prefix not supported yet.
        Please remove "{" from "${def.prefix}".
      `)
    }
  }

  prefix(prefix: HTTPPath): RouterBuilder<TContext, TExtraContext> {
    return new RouterBuilder({
      ...this['~orpc'],
      prefix: `${this['~orpc'].prefix ?? ''}${prefix}`,
    })
  }

  tag(...tags: string[]): RouterBuilder<TContext, TExtraContext> {
    return new RouterBuilder({
      ...this['~orpc'],
      tags: [...(this['~orpc'].tags ?? []), ...tags],
    })
  }

  use<U extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined>(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      U,
      unknown,
      unknown
    >,
  ): RouterBuilder<TContext, MergeContext<TExtraContext, U>> {
    return new RouterBuilder({
      ...this['~orpc'],
      middlewares: [...(this['~orpc'].middlewares ?? []), middleware as any],
    })
  }

  router<U extends Router<MergeContext<TContext, TExtraContext>, any>>(
    router: U,
  ): AdaptedRouter<TContext, U> {
    const adapted = adapt(router, this['~orpc'])
    return adapted as any
  }

  lazy<U extends Router<MergeContext<TContext, TExtraContext>, any>>(
    loader: () => Promise<{ default: U }>,
  ): AdaptedRouter<TContext, FlattenLazy<U>> {
    const adapted = adapt(flatLazy(lazy(loader)), this['~orpc'])
    return adapted as any
  }
}

function adapt(
  item: ANY_ROUTER,
  options: {
    middlewares?: ANY_MIDDLEWARE[]
    tags?: readonly string[]
    prefix?: HTTPPath
  },
): ANY_ROUTER {
  if (isLazy(item)) {
    const adaptedLazy = decorateLazy(lazy(async () => {
      const routerOrProcedure = (await unlazy(item)).default as ANY_ROUTER | ANY_PROCEDURE
      const adapted = adapt(routerOrProcedure, options)

      return { default: adapted }
    }))

    const lazyPrefix = getLazyRouterPrefix(item)
    if (options.prefix || lazyPrefix) {
      const prefixed = deepSetLazyRouterPrefix(adaptedLazy, `${options.prefix ?? ''}${lazyPrefix ?? ''}` as any)
      return prefixed
    }

    return adaptedLazy
  }

  if (isProcedure(item)) {
    let decorated = decorateProcedure(item)

    if (options.tags?.length) {
      decorated = decorated.unshiftTag(...options.tags)
    }

    if (options.prefix) {
      decorated = decorated.prefix(options.prefix)
    }

    if (options.middlewares?.length) {
      decorated = decorated.unshiftMiddleware(...options.middlewares)
    }

    return decorated
  }

  const adapted = {} as Record<string, any>
  for (const key in item) {
    adapted[key] = adapt(item[key]!, options)
  }

  return adapted
}
