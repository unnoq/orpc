import type { ErrorMap, MergedErrorMap, Meta } from '@orpc/contract'
import type { Context, MergedContext } from './context'
import type { AnyMiddleware, MapInputMiddleware, Middleware, MiddlewareNextFn } from './middleware'
import { mergeErrorMap } from '@orpc/contract'

export interface DecoratedMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
> extends Middleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta> {
  errors<U extends ErrorMap>(
    errors: U,
  ): DecoratedMiddleware<
    TInContext,
    TOutContext,
    TInput,
    TOutput,
    MergedErrorMap<TErrorMap, U>,
    TMeta
  >

  concat<UOutContext extends Context, UInput, UErrorMap extends ErrorMap = TErrorMap>(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UInput & TInput,
      TOutput,
      UErrorMap,
      TMeta
    >,
  ): DecoratedMiddleware<
    TInContext,
    MergedContext<TOutContext, UOutContext>,
    UInput & TInput,
    TOutput,
    MergedErrorMap<TErrorMap, UErrorMap>,
    TMeta
  >

  concat<
    UOutContext extends Context,
    UInput,
    UMappedInput,
    UErrorMap extends ErrorMap = TErrorMap,
  >(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UMappedInput,
      TOutput,
      UErrorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<UInput & TInput, UMappedInput>,
  ): DecoratedMiddleware<
    TInContext,
    TOutContext & UOutContext,
    UInput & TInput,
    TOutput,
    MergedErrorMap<TErrorMap, UErrorMap>,
    TMeta
  >

  mapInput<UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ): DecoratedMiddleware<TInContext, TOutContext, UInput, TOutput, TErrorMap, TMeta>
}

export function decorateMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorMap extends ErrorMap,
  TMeta extends Meta,
>(
  middleware: Middleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta>,
): DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta> {
  const decorated = middleware as DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorMap, TMeta>

  decorated.errors = (errors) => {
    const cloned: Middleware<TInContext, TOutContext, TInput, TOutput, any, TMeta> = (...args) => middleware(...args)

    cloned['~errorMap'] = mergeErrorMap(middleware['~errorMap'] ?? {}, errors)

    return decorateMiddleware(cloned)
  }

  decorated.mapInput = (mapInput) => {
    const mapped = decorateMiddleware(
      (options, input, ...rest) => middleware(options as any, mapInput(input as any), ...rest as [any]),
    )

    return mapped as any
  }

  decorated.concat = (concatMiddleware: AnyMiddleware, mapInput?: MapInputMiddleware<any, any>) => {
    const mapped = mapInput
      ? decorateMiddleware(concatMiddleware).mapInput(mapInput)
      : concatMiddleware

    const concatted = decorateMiddleware((options, input, output, ...rest) => {
      const next: MiddlewareNextFn<any, any> = async (...[nextOptions]) => {
        return mapped({ ...options, context: { ...nextOptions?.context, ...options.context } }, input, output, ...rest)
      }

      const merged = middleware({ ...options, next } as any, input as any, output as any, ...rest)

      return merged
    })

    concatted['~errorMap'] = mergeErrorMap(middleware['~errorMap'] ?? {}, mapped['~errorMap'] ?? {})

    return concatted as any
  }

  return decorated
}
