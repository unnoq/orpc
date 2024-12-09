import type { Procedure } from './procedure'
import type { ProcedureCaller } from './procedure-caller'
import { createProcedureCaller } from './procedure-caller'

export const LAZY_LOADER_SYMBOL: unique symbol = Symbol('ORPC_LAZY_LOADER')

export interface Lazy<T> {
  [LAZY_LOADER_SYMBOL]: () => Promise<{ default: T }>
}

export type ANY_LAZY = Lazy<any>

export function createLazy<T>(loader: () => Promise<{ default: T }>): Lazy<T> {
  return {
    [LAZY_LOADER_SYMBOL]: loader,
  }
}

export function loadLazy<T>(lazy: Lazy<T>): Promise<{ default: T }> {
  return lazy[LAZY_LOADER_SYMBOL]()
}

export function isLazy(item: unknown): item is ANY_LAZY {
  return (
    (typeof item === 'object' || typeof item === 'function')
    && item !== null
    && LAZY_LOADER_SYMBOL in item
    && typeof item[LAZY_LOADER_SYMBOL] === 'function'
  )
}

export type FlattenLazy<T> = T extends Lazy<infer U>
  ? FlattenLazy<U>
  : Lazy<T>

export function createFlattenLazy<T>(lazy: Lazy<T>): FlattenLazy<T> {
  const flattenLoader = async () => {
    let current = await loadLazy(lazy)

    while (true) {
      if (!isLazy(current.default)) {
        break
      }

      current = await loadLazy(current.default)
    }

    return current
  }

  const flattenLazy = {
    [LAZY_LOADER_SYMBOL]: flattenLoader,
  }

  return flattenLazy as any
}

export type DecoratedLazy<T> = T extends Lazy<infer U>
  ? DecoratedLazy<U>
  : (
      T extends Procedure<infer UContext, any, any, any, any> ? Lazy<T> & (undefined extends UContext ? ProcedureCaller<T> : unknown)
        : T extends Record<any, any>
          ? {
              [K in keyof T]: DecoratedLazy<T[K]>
            } /** Notice: this still a lazy, but type not work when I & Lazy<T>, maybe it's a bug, should improve */
          : Lazy<T>
    )

export function decorateLazy<T>(lazy: Lazy<T>): DecoratedLazy<T> {
  const flattenLazy = createFlattenLazy(lazy)

  const procedureCaller = createProcedureCaller({
    procedure: flattenLazy as any,
    context: undefined as any,
  })

  Object.assign(procedureCaller, flattenLazy)

  const recursive = new Proxy(procedureCaller, {
    get(target, key) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key)
      }

      return decorateLazy(createLazy(async () => {
        const current = await loadLazy(flattenLazy)
        return { default: (current.default as any)[key] }
      }))
    },
  })

  return recursive as any
}
