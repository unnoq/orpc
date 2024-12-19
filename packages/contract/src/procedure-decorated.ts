import type { RouteOptions } from './procedure'
import type { HTTPPath, Schema, SchemaInput, SchemaOutput } from './types'
import { ContractProcedure } from './procedure'

export class DecoratedContractProcedure<
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
> extends ContractProcedure<TInputSchema, TOutputSchema> {
  static decorate<
    UInputSchema extends Schema = undefined,
    UOutputSchema extends Schema = undefined,
  >(
    procedure: ContractProcedure<UInputSchema, UOutputSchema>,
  ): DecoratedContractProcedure<UInputSchema, UOutputSchema> {
    if (procedure instanceof DecoratedContractProcedure) {
      return procedure
    }

    return new DecoratedContractProcedure(procedure['~orpc'])
  }

  route(route: RouteOptions): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route,
    })
  }

  prefix(prefix: HTTPPath): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      ...(this['~orpc'].route?.path
        ? {
            route: {
              ...this['~orpc'].route,
              path: `${prefix}${this['~orpc'].route.path}`,
            },
          }
        : undefined),
    })
  }

  unshiftTag(...tags: string[]): DecoratedContractProcedure<TInputSchema, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      route: {
        ...this['~orpc'].route,
        tags: [
          ...tags,
          ...this['~orpc'].route?.tags?.filter(tag => !tags.includes(tag)) ?? [],
        ],
      },
    })
  }

  input<U extends Schema = undefined>(schema: U, example?: SchemaInput<U>): DecoratedContractProcedure<U, TOutputSchema> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      InputSchema: schema as any,
      inputExample: example as any,
    })
  }

  output<U extends Schema = undefined>(schema: U, example?: SchemaOutput<U>): DecoratedContractProcedure<TInputSchema, U> {
    return new DecoratedContractProcedure({
      ...this['~orpc'],
      OutputSchema: schema as any,
      outputExample: example as any,
    })
  }
}
