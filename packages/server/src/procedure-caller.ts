import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, PartialOnUndefinedDeep, Value } from '@orpc/shared'
import type { Lazy } from './lazy'
import type { MiddlewareMeta } from './middleware'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, Procedure, WELL_DEFINED_PROCEDURE } from './procedure'
import type { Caller, Context, Meta } from './types'
import { executeWithHooks, trim, value } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { isLazy, loadLazy } from './lazy'
import { isProcedure } from './procedure'
import { mergeContext } from './utils'

export type CreateProcedureCallerOptions<
  T extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE,
> = T extends
| Procedure<infer UContext, any, any, infer UOutputSchema, infer UFuncOutput>
| Lazy<Procedure<infer UContext, any, any, infer UOutputSchema, infer UFuncOutput>> ? {
  procedure: T

  /**
   * This is helpful for logging and analytics.
   *
   * @internal
   */
  path?: string[]
} & PartialOnUndefinedDeep<{
  /**
   * The context used when calling the procedure.
   */
  context: Value<UContext>
}> & Hooks<unknown, SchemaOutput<UOutputSchema, UFuncOutput>, UContext, { path: string[], procedure: ANY_PROCEDURE }>
  : never

export type ProcedureCaller<
  TProcedure extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE,
> = TProcedure extends
| Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput >
| Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput >>
  ? Caller<SchemaInput<UInputSchema>, SchemaOutput<UOutputSchema, UFuncOutput>>
  : never

export function createProcedureCaller<
  TProcedure extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE,
>(
  options: CreateProcedureCallerOptions<TProcedure>,
): ProcedureCaller<TProcedure> {
  const caller: Caller<unknown, unknown> = async (...args) => {
    const [input, callerOptions] = args

    const path = options.path ?? []
    const procedure = await loadProcedure(options.procedure) as WELL_DEFINED_PROCEDURE
    const context = await value(options.context)

    const execute = async () => {
      const validInput = await (async () => {
        const schema = procedure.zz$p.contract.zz$cp.InputSchema
        if (!schema) {
          return input
        }

        const result = await schema['~standard'].validate(input)

        if (result.issues) {
          throw new ORPCError({
            message: 'Validation input failed',
            code: 'BAD_REQUEST',
            issues: result.issues,
          })
        }

        return result.value
      })()

      const meta: Meta = {
        path,
        procedure,
        signal: callerOptions?.signal,
      }

      const middlewares = procedure.zz$p.middlewares ?? []
      let currentMidIndex = 0
      let currentContext: Context = context

      const next: MiddlewareMeta<unknown>['next'] = async (nextOptions) => {
        const mid = middlewares[currentMidIndex]
        currentMidIndex += 1
        currentContext = mergeContext(currentContext, nextOptions.context)

        if (mid) {
          return await mid(validInput, currentContext, {
            ...meta,
            next,
            output: output => ({ output, context: undefined }),
          })
        }
        else {
          return {
            output: await await procedure.zz$p.func(validInput, currentContext, meta),
            context: currentContext,
          }
        }
      }

      const output = (await next({})).output

      const validOutput = await (async () => {
        const schema = procedure.zz$p.contract.zz$cp.OutputSchema
        if (!schema) {
          return output
        }

        const result = await schema['~standard'].validate(output)
        if (result.issues) {
          throw new ORPCError({
            message: 'Validation output failed',
            code: 'INTERNAL_SERVER_ERROR',
          })
        }
        return result.value
      })()

      return validOutput
    }

    const output = await executeWithHooks({
      hooks: options,
      input,
      context,
      meta: {
        path,
        procedure,
      },
      execute,
    })

    return output
  }

  return caller as any
}

export async function loadProcedure(procedure: ANY_PROCEDURE | ANY_LAZY_PROCEDURE): Promise<ANY_PROCEDURE> {
  let loadedProcedure: ANY_PROCEDURE

  if (isLazy(procedure)) {
    loadedProcedure = (await loadLazy(procedure)).default
  }
  else {
    loadedProcedure = procedure
  }

  if (!isProcedure(loadedProcedure)) {
    throw new ORPCError({
      code: 'NOT_FOUND',
      message: 'Not found',
      cause: new Error(trim(`
          This error should be caught by the typescript compiler.
          But if you still see this error, it means that you trying to call a lazy router (expected to be a lazy procedure).
        `)),
    })
  }

  return loadedProcedure
}
