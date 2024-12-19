import type { ANY_MAP_INPUT_MIDDLEWARE, ANY_MIDDLEWARE, MapInputMiddleware, Middleware, MiddlewareMeta } from './middleware'
import type { Context, MergeContext, WELL_CONTEXT } from './types'
import { mergeContext } from './utils'

export interface DecoratedMiddleware<
  TContext extends Context,
  TExtraContext extends Context,
  TInput,
  TOutput,
> extends Middleware<TContext, TExtraContext, TInput, TOutput> {
  concat: (<
    UExtraContext extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
            UInput & TInput,
            TOutput
    >,
  ) => DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
        UInput & TInput,
        TOutput
  >) & (<
    UExtraContext extends Context & Partial<MergeContext<TContext, TExtraContext>> | undefined = undefined,
    UInput = TInput,
    UMappedInput = unknown,
  >(
    middleware: Middleware<
      MergeContext<TContext, TExtraContext>,
      UExtraContext,
      UMappedInput,
      TOutput
    >,
    mapInput: MapInputMiddleware<UInput & TInput, UMappedInput>,
  ) => DecoratedMiddleware<
    TContext,
    MergeContext<TExtraContext, UExtraContext>,
        UInput & TInput,
        TOutput
  >)

  mapInput: <UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ) => DecoratedMiddleware<TContext, TExtraContext, UInput, TOutput>
}

export function decorateMiddleware<
  TContext extends Context = WELL_CONTEXT,
  TExtraContext extends Context = undefined,
  TInput = unknown,
  TOutput = unknown,
>(
  middleware: Middleware<TContext, TExtraContext, TInput, TOutput>,
): DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput> {
  const decorated = middleware as DecoratedMiddleware<TContext, TExtraContext, TInput, TOutput>

  decorated.mapInput = (mapInput) => {
    const mapped = decorateMiddleware(
      (input, ...rest) => middleware(mapInput(input as any), ...rest as [any, any]),
    )

    return mapped as any
  }

  decorated.concat = (concatMiddleware: ANY_MIDDLEWARE, mapInput?: ANY_MAP_INPUT_MIDDLEWARE) => {
    const mapped = mapInput
      ? decorateMiddleware(concatMiddleware).mapInput(mapInput)
      : concatMiddleware

    const concatted = decorateMiddleware((input, context, meta, ...rest) => {
      const next: MiddlewareMeta<any>['next'] = async (options) => {
        return mapped(input, mergeContext(context, options.context), meta, ...rest)
      }

      const merged = middleware(input as any, context as any, { ...meta, next }, ...rest)

      return merged
    })

    return concatted as any
  }

  return decorated
}
