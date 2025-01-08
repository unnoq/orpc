import type { ErrorMap, Schema, SchemaInput, SchemaOutput } from '@orpc/contract'
import type { Hooks, Value } from '@orpc/shared'
import type { ErrorFromErrorMap } from './error'
import type { Lazyable } from './lazy'
import type { MiddlewareNextFn } from './middleware'
import type { ANY_PROCEDURE, Procedure, ProcedureHandlerOptions } from './procedure'
import type { AbortSignal, Context, Meta } from './types'
import { executeWithHooks, value } from '@orpc/shared'
import { ORPCError } from '@orpc/shared/error'
import { unlazy } from './lazy'
import { mergeContext } from './utils'

export type ProcedureClientOptions<TClientContext> =
  & { signal?: AbortSignal }
  & (undefined extends TClientContext ? { context?: TClientContext } : { context: TClientContext })

export interface ProcedureClient<TClientContext, TInput, TOutput, TError extends Error> {
  (
    ...opts:
      | [input: TInput, options: ProcedureClientOptions<TClientContext>]
      | (undefined extends TInput & TClientContext ? [] : never)
      | (undefined extends TClientContext ? [input: TInput] : never)
  ): Promise<TOutput> & { __typeError?: TError }
}

/**
 * Options for creating a procedure caller with comprehensive type safety
 */
export type CreateProcedureClientOptions<
  TContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
> =
  & {
    procedure: Lazyable<Procedure<TContext, any, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>>

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
  & Hooks<unknown, SchemaOutput<TOutputSchema, THandlerOutput>, TContext, Meta>

export function createProcedureClient<
  TContext extends Context,
  TInputSchema extends Schema,
  TOutputSchema extends Schema,
  THandlerOutput extends SchemaInput<TOutputSchema>,
  TErrorMap extends ErrorMap,
>(
  options: CreateProcedureClientOptions<TContext, TInputSchema, TOutputSchema, THandlerOutput, TErrorMap>,
): ProcedureClient<unknown, SchemaInput<TInputSchema>, SchemaOutput<TOutputSchema, THandlerOutput>, ErrorFromErrorMap<TErrorMap>> {
  // TODO: handle errors
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

      const output = await executeMiddlewareChain({
        context,
        input: validInput,
        path,
        procedure,
        signal: callerOptions?.signal,
      })

      return validateOutput(procedure, output) as SchemaOutput<TOutputSchema, THandlerOutput>
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

async function executeMiddlewareChain(opt: ProcedureHandlerOptions<any, any>) {
  const middlewares = opt.procedure['~orpc'].middlewares ?? []
  let currentMidIndex = 0
  let currentContext = opt.context

  const next: MiddlewareNextFn<any> = async (nextOptions) => {
    const mid = middlewares[currentMidIndex]
    currentMidIndex += 1
    currentContext = mergeContext(currentContext, nextOptions.context)

    if (mid) {
      return await mid({ ...opt, context: currentContext, next }, opt.input, output => ({ output, context: undefined }))
    }

    const result = {
      output: await opt.procedure['~orpc'].handler({ ...opt, context: currentContext }),
      context: currentContext,
    }

    return result
  }

  return (await next({})).output
}
