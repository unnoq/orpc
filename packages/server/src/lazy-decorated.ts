import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Lazy } from './lazy'
import type { Procedure } from './procedure'
import type { Caller } from './types'
import { flatLazy } from './lazy'
import { createProcedureCaller } from './procedure-caller'
import { type ANY_ROUTER, getRouterChild } from './router'

export type DecoratedLazy<T> = T extends Lazy<infer U>
  ? DecoratedLazy<U>
  :
    & Lazy<T>
    & (
       T extends Procedure<infer UContext, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
         ? undefined extends UContext
           ? Caller<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
           : unknown
         : {
             [K in keyof T]: T[K] extends object ? DecoratedLazy<T[K]> : never
           }
    )

export function decorateLazy<T extends Lazy<ANY_ROUTER | undefined>>(lazied: T): DecoratedLazy<T> {
  const flattenLazy = flatLazy(lazied)

  const procedureCaller = createProcedureCaller({
    procedure: flattenLazy,
    context: undefined,
  })

  Object.assign(procedureCaller, flattenLazy)

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      const next = getRouterChild(flattenLazy, key)

      return decorateLazy(next)
    },
  })

  return recursive as any
}
