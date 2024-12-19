import type { RouteOptions } from './procedure'
import type { ContractRouter } from './router'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { DecoratedContractProcedure } from './procedure-decorated'
import { ContractRouterBuilder } from './router-builder'

export class ContractBuilder {
  prefix(prefix: HTTPPath): ContractRouterBuilder {
    return new ContractRouterBuilder({
      prefix,
    })
  }

  tag(...tags: string[]): ContractRouterBuilder {
    return new ContractRouterBuilder({
      tags,
    })
  }

  route(route: RouteOptions): DecoratedContractProcedure<undefined, undefined> {
    return new DecoratedContractProcedure({
      route,
      InputSchema: undefined,
      OutputSchema: undefined,
    })
  }

  input<U extends Schema = undefined>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, undefined> {
    return new DecoratedContractProcedure({
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
    })
  }

  output<U extends Schema = undefined>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<undefined, U> {
    return new DecoratedContractProcedure({
      OutputSchema: schema,
      outputExample: example,
      InputSchema: undefined,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    return router
  }
}
