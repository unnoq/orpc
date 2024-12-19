import type { ContractRouter, HTTPPath } from '@orpc/contract'

const ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_ROUTER_CONTRACT')

export function setRouterContract<T extends object>(obj: T, contract: ContractRouter): T {
  return new Proxy(obj, {
    get(target, key) {
      if (key === ROUTER_CONTRACT_SYMBOL) {
        return contract
      }

      return Reflect.get(target, key)
    },
  })
}

export function getRouterContract(obj: object): ContractRouter | undefined {
  return (obj as any)[ROUTER_CONTRACT_SYMBOL]
}

const LAZY_ROUTER_PREFIX_SYMBOL = Symbol('ORPC_LAZY_ROUTER_PREFIX')

export function deepSetLazyRouterPrefix<T extends object>(router: T, prefix: HTTPPath): T {
  return new Proxy(router, {
    get(target, key) {
      if (key !== LAZY_ROUTER_PREFIX_SYMBOL) {
        const val = Reflect.get(target, key)
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          return deepSetLazyRouterPrefix(val, prefix)
        }

        return val
      }

      return prefix
    },
  })
}

export function getLazyRouterPrefix(obj: object): HTTPPath | undefined {
  return (obj as any)[LAZY_ROUTER_PREFIX_SYMBOL]
}
