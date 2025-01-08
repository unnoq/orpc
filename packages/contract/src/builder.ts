import type { ErrorMap } from './error-map'
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

  route(route: RouteOptions): DecoratedContractProcedure<undefined, undefined, undefined> {
    return new DecoratedContractProcedure({
      route,
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap: undefined,
    })
  }

  input<U extends Schema>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, undefined, undefined> {
    return new DecoratedContractProcedure({
      InputSchema: schema,
      inputExample: example,
      OutputSchema: undefined,
      errorMap: undefined,
    })
  }

  output<U extends Schema>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<undefined, U, undefined> {
    return new DecoratedContractProcedure({
      OutputSchema: schema,
      outputExample: example,
      InputSchema: undefined,
      errorMap: undefined,
    })
  }

  errors<const U extends ErrorMap>(errorMap: U): DecoratedContractProcedure<undefined, undefined, U> {
    // use const here for make sure the when implement must match the errorMap from contract from status to data schema
    return new DecoratedContractProcedure({
      InputSchema: undefined,
      OutputSchema: undefined,
      errorMap,
    })
  }

  router<T extends ContractRouter>(router: T): T {
    return router
  }
}
