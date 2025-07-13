import type { Schema } from '../src'
import type { Meta } from '../src/meta'
import * as z from 'zod'
import { ContractProcedure, eventIterator } from '../src'

export const inputSchema = z.object({ input: z.number().transform(n => `${n}`) })

export const outputSchema = z.object({ output: z.number().transform(n => `${n}`) })

export const generalSchema = z.object({ general: z.number().transform(n => `${n}`) })

export const baseErrorMap = {
  BASE: {
    data: outputSchema,
  },
  OVERRIDE: {},
}

export const baseRoute = { path: '/base' } as const

export type BaseMeta = { mode?: string, log?: boolean }

export const baseMeta: BaseMeta = {
  mode: 'dev',
}

export const ping = new ContractProcedure<
  typeof inputSchema,
  typeof outputSchema,
  typeof baseErrorMap,
  BaseMeta
>({
  inputSchema,
  outputSchema,
  errorMap: baseErrorMap,
  meta: baseMeta,
  route: baseRoute,
})

export const pong = new ContractProcedure<
  Schema<unknown, unknown>,
  Schema<unknown, unknown>,
  Record<never, never>,
  Meta
>({
  errorMap: {},
  meta: {},
  route: {},
})

export const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

export const streamedOutputSchema = eventIterator(outputSchema)

export const streamed = new ContractProcedure<
  typeof inputSchema,
  typeof streamedOutputSchema,
  typeof baseErrorMap,
  Meta
>({
  errorMap: baseErrorMap,
  meta: {},
  route: {},
  inputSchema,
  outputSchema: streamedOutputSchema,
})
