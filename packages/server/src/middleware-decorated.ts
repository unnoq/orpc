import type { Meta } from '@orpc/contract'
import type { Context, MergedContext } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { AnyMiddleware, MapInputMiddleware, Middleware } from './middleware'

export interface DecoratedMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
> extends Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta> {
  concat<UOutContext extends Context, UInput>(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UInput & TInput,
      TOutput,
      TErrorConstructorMap,
      TMeta
    >,
  ): DecoratedMiddleware<
    TInContext,
    MergedContext<TOutContext, UOutContext>,
    UInput & TInput,
    TOutput,
    TErrorConstructorMap,
    TMeta
  >

  concat<
    UOutContext extends Context,
    UInput,
    UMappedInput,
  >(
    middleware: Middleware<
      TInContext & TOutContext,
      UOutContext,
      UMappedInput,
      TOutput,
      TErrorConstructorMap,
      TMeta
    >,
    mapInput: MapInputMiddleware<UInput & TInput, UMappedInput>,
  ): DecoratedMiddleware<
    TInContext,
    TOutContext & UOutContext,
    UInput & TInput,
    TOutput,
    TErrorConstructorMap,
    TMeta
  >

  mapInput<UInput = unknown>(
    map: MapInputMiddleware<UInput, TInput>,
  ): DecoratedMiddleware<TInContext, TOutContext, UInput, TOutput, TErrorConstructorMap, TMeta>
}

export function decorateMiddleware<
  TInContext extends Context,
  TOutContext extends Context,
  TInput,
  TOutput,
  TErrorConstructorMap extends ORPCErrorConstructorMap<any>,
  TMeta extends Meta,
>(
  middleware: Middleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta>,
): DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta> {
  const decorated = middleware as DecoratedMiddleware<TInContext, TOutContext, TInput, TOutput, TErrorConstructorMap, TMeta>

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
      const merged = middleware({
        ...options,
        next: (...[nextOptions1]: [any]) => mapped({
          ...options,
          context: { ...options.context, ...nextOptions1?.context },
          next: (...[nextOptions2]) => options.next({ context: { ...nextOptions1?.context, ...nextOptions2?.context } }) as any,
        }, input, output, ...rest),
      } as any, input as any, output as any, ...rest)

      return merged
    })

    return concatted as any
  }

  return decorated
}
