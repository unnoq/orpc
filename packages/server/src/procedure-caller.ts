import type { Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, Value } from '@orpc/shared'
import type { Lazyable } from './lazy'
import type { MiddlewareMeta } from './middleware'
import type {
  ANY_PROCEDURE,
  Procedure,
} from './procedure'

import type { Caller, Context, Meta, WELL_CONTEXT } from './types'
import { executeWithHooks, value } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { unlazy } from './lazy'
import { mergeContext } from './utils'

/**
 * Options for creating a procedure caller with comprehensive type safety
 */
export type CreateProcedureCallerOptions<
  TContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  TFuncOutput extends SchemaInput<TOutputSchema>,
> =
  & {
    procedure: Lazyable<Procedure<TContext, any, TInputSchema, TOutputSchema, TFuncOutput>>

    /**
     * This is helpful for logging and analytics.
     *
     * @internal
     */
    path?: string[]
  }
  & ({
    /**
     * The context used when calling the procedure.
     */
    context: Value<TContext>
  } | (undefined extends TContext ? { context?: undefined } : never))
  & Hooks<unknown, SchemaOutput<TOutputSchema, TFuncOutput>, TContext, Meta>

export function createProcedureCaller<
  TContext extends Context = WELL_CONTEXT,
  TInputSchema extends Schema = undefined,
  TOutputSchema extends Schema = undefined,
  TFuncOutput extends SchemaInput<TOutputSchema> = SchemaInput<TOutputSchema>,
>(
  options: CreateProcedureCallerOptions<TContext, TInputSchema, TOutputSchema, TFuncOutput>,
): Caller<SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema, TFuncOutput>> {
  return async (...[input, callerOptions]) => {
    const path = options.path ?? []
    const { default: procedure } = await unlazy(options.procedure)
    const context = await value(options.context) as TContext

    const meta: Meta = {
      path,
      procedure,
      signal: callerOptions?.signal,
    }

    const executeWithValidation = async () => {
      const validInput = await validateInput(procedure, input)

      const output = await executeMiddlewareChain(
        procedure,
        validInput,
        context,
        meta,
      )

      return validateOutput(procedure, output) as SchemaOutput<TOutputSchema, TFuncOutput>
    }

    return executeWithHooks({
      hooks: options,
      input,
      context,
      meta,
      execute: executeWithValidation,
    })
  }
}

async function validateInput(procedure: ANY_PROCEDURE, input: unknown) {
  const schema = procedure['~orpc'].contract['~orpc'].InputSchema
  if (!schema)
    return input

  const result = await schema['~standard'].validate(input)
  if (result.issues) {
    throw new ORPCError({
      message: 'Input validation failed',
      code: 'BAD_REQUEST',
      issues: result.issues,
    })
  }

  return result.value
}

async function validateOutput(procedure: ANY_PROCEDURE, output: unknown) {
  const schema = procedure['~orpc'].contract['~orpc'].OutputSchema
  if (!schema)
    return output

  const result = await schema['~standard'].validate(output)
  if (result.issues) {
    throw new ORPCError({
      message: 'Output validation failed',
      code: 'INTERNAL_SERVER_ERROR',
      issues: result.issues,
    })
  }

  return result.value
}

async function executeMiddlewareChain(
  procedure: ANY_PROCEDURE,
  input: unknown,
  context: Context,
  meta: Meta,
) {
  const middlewares = procedure['~orpc'].middlewares ?? []
  let currentMidIndex = 0
  let currentContext = context

  const next: MiddlewareMeta<unknown>['next'] = async (nextOptions) => {
    const mid = middlewares[currentMidIndex]
    currentMidIndex += 1
    currentContext = mergeContext(currentContext, nextOptions.context)

    if (mid) {
      return await mid(input, currentContext, {
        ...meta,
        next,
        output: output => ({ output, context: undefined }),
      })
    }

    const result = {
      output: await procedure['~orpc'].func(input, currentContext, meta),
      context: currentContext,
    }

    return result as any
  }

  return (await next({})).output
}
