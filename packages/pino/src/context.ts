import type { Logger } from 'pino'

export const CONTEXT_LOGGER_SYMBOL: unique symbol = Symbol('ORPC_PINO_CONTEXT_LOGGER_SYMBOL')

export interface LoggerContext {
  [CONTEXT_LOGGER_SYMBOL]?: Logger
}

export function getLogger(context: LoggerContext): Logger | undefined {
  return context[CONTEXT_LOGGER_SYMBOL]
}
