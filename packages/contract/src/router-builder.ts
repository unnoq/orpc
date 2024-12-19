import type { ContractProcedure } from './procedure'
import type { ContractRouter } from './router'
import type { HTTPPath } from './types'
import { isContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

export type AdaptedContractRouter<TContract extends ContractRouter> = {
  [K in keyof TContract]: TContract[K] extends ContractProcedure<infer UInputSchema, infer UOutputSchema >
    ? DecoratedContractProcedure<UInputSchema, UOutputSchema>
    : TContract[K] extends ContractRouter
      ? AdaptedContractRouter<TContract[K]>
      : never
}

export interface ContractRouterBuilderDef {
  prefix?: HTTPPath
  tags?: string[]
}

export class ContractRouterBuilder {
  '~type' = 'ContractProcedure' as const
  '~orpc': ContractRouterBuilderDef

  constructor(def: ContractRouterBuilderDef) {
    this['~orpc'] = def
  }

  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      prefix: `${this['~orpc'].prefix ?? ''}${prefix}`,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder {
    return new ContractRouterBuilder({
      ...this['~orpc'],
      tags: [...(this['~orpc'].tags ?? []), ...tags],
    })
  }

  router<T extends ContractRouter>(router: T): AdaptedContractRouter<T> {
    if (isContractProcedure(router)) {
      let decorated = DecoratedContractProcedure.decorate(router)

      if (this['~orpc'].tags) {
        decorated = decorated.unshiftTag(...this['~orpc'].tags)
      }

      if (this['~orpc'].prefix) {
        decorated = decorated.prefix(this['~orpc'].prefix)
      }

      return decorated as any
    }

    const adapted: ContractRouter = {}

    for (const key in router) {
      adapted[key] = this.router(router[key]!)
    }

    return adapted as any
  }
}
