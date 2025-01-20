import type { ContractProcedure, ContractRouter, SchemaInput, SchemaOutput, StrictErrorMap, StrictRoute } from '@orpc/contract'
import type { Context } from './context'
import type { ANY_LAZY, Lazy, Lazyable } from './lazy'
import type { ANY_PROCEDURE, Procedure } from './procedure'
import { flatLazy, isLazy, lazy, unlazy } from './lazy'
import { isProcedure } from './procedure'

export type Router<
  TInitialContext extends Context,
  TContract extends ContractRouter<any>,
> = Lazyable<
  TContract extends ContractProcedure<infer UInputSchema, infer UOutputSchema, infer UErrorMap, infer URoute>
    ? Procedure<TInitialContext, any, UInputSchema, UOutputSchema, any, StrictErrorMap<UErrorMap>, StrictRoute<URoute>>
    : {
        [K in keyof TContract]: TContract[K] extends ContractRouter<any> ? Router<TInitialContext, TContract[K]> : never
      }
>

export type ANY_ROUTER = Router<any, any>

export type InferRouterInputs<T extends ANY_ROUTER> =
  T extends Lazy<infer U extends ANY_ROUTER> ? InferRouterInputs<U>
    : T extends Procedure<any, any, infer UInputSchema, any, any, any, any>
      ? SchemaInput<UInputSchema>
      : {
          [K in keyof T]: T[K] extends ANY_ROUTER ? InferRouterInputs<T[K]> : never
        }

export type InferRouterOutputs<T extends ANY_ROUTER> =
  T extends Lazy<infer U extends ANY_ROUTER> ? InferRouterOutputs<U>
    : T extends Procedure<any, any, any, infer UOutputSchema, infer UFuncOutput, any, any>
      ? SchemaOutput<UOutputSchema, UFuncOutput>
      : {
          [K in keyof T]: T[K] extends ANY_ROUTER ? InferRouterOutputs<T[K]> : never
        }

export function getRouterChild<
  T extends ANY_ROUTER | Lazy<undefined>,
>(router: T, ...path: string[]): T extends ANY_LAZY
  ? Lazy<ANY_PROCEDURE> | Lazy<Record<string, ANY_ROUTER>> | Lazy<undefined>
  : ANY_ROUTER | Lazy<undefined> | undefined {
  let current: ANY_ROUTER | Lazy<undefined> | undefined = router

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!

    if (!current) {
      return undefined as any
    }

    if (isProcedure(current)) {
      return undefined as any
    }

    if (!isLazy(current)) {
      current = current[segment]

      continue
    }

    const lazied = current
    const rest = path.slice(i)

    const newLazy = lazy(async () => {
      const unwrapped = await unlazy(lazied)

      if (!unwrapped.default) {
        return unwrapped
      }

      const next = getRouterChild(unwrapped.default, ...rest)

      return { default: next }
    })

    return flatLazy(newLazy)
  }

  return current as any
}
