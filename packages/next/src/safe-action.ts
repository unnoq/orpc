import type { SchemaInput, SchemaOutput } from '@orpc/contract'
import type { ANY_LAZY_PROCEDURE, ANY_PROCEDURE, CreateProcedureCallerOptions, Lazy, Procedure, WELL_ORPC_ERROR_JSON } from '@orpc/server'
import { createProcedureCaller, ORPCError } from '@orpc/server'
import { isNotFoundError } from 'next/dist/client/components/not-found'
import { isRedirectError } from 'next/dist/client/components/redirect'

export type SafeAction<T extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE> = T extends
  | Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>
  | Lazy<Procedure<any, any, infer UInputSchema, infer UOutputSchema, infer UFuncOutput>>
  ? (input: SchemaInput<UInputSchema>) => Promise<
    | [SchemaOutput<UOutputSchema, UFuncOutput>, undefined, 'success']
    | [undefined, WELL_ORPC_ERROR_JSON, 'error']
    >
  : never

export function createSafeAction<T extends ANY_PROCEDURE | ANY_LAZY_PROCEDURE>(opt: CreateProcedureCallerOptions<T>): SafeAction<T> {
  const caller = createProcedureCaller(opt)

  const safeAction = async (...input: [any] | []) => {
    try {
      const output = await caller(...input)
      return [output as any, undefined, 'success']
    }
    catch (e) {
      if (isRedirectError(e)) {
        throw e
      }

      const error = convertToORPCError(e)

      return [undefined, error.toJSON(), 'error']
    }
  }

  return safeAction as any
}

function convertToORPCError(e: unknown): ORPCError<any, any> {
  if (e instanceof ORPCError) {
    return e
  }

  if (isNotFoundError(e)) {
    return new ORPCError({
      code: 'NOT_FOUND',
      message: 'Not found',
      cause: e,
    })
  }

  return new ORPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    cause: e,
  })
}
