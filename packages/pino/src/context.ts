import type { Logger } from 'pino'

/**
 * Context symbol under which the Pino logger is stored. Use it to provide a
 * custom logger instance per request, e.g. when integrating with pino-http.
 *
 * @see {@link https://orpc.dev/docs/integrations/pino#providing-custom-logger-per-request | Pino}
 */
export const LOGGER_CONTEXT_SYMBOL: unique symbol = Symbol.for('ORPC_PINO_LOGGER_CONTEXT')

/**
 * Context shape that carries the Pino logger injected by `PinoHandlerPlugin`.
 *
 * @see {@link https://orpc.dev/docs/integrations/pino#using-the-logger-in-your-code | Pino}
 */
export interface LoggerContext {
  [LOGGER_CONTEXT_SYMBOL]?: undefined | Logger
}

/**
 * Retrieves the Pino logger from the oRPC context, if available.
 *
 * @see {@link https://orpc.dev/docs/integrations/pino#using-the-logger-in-your-code | Pino}
 */
export function getLogger(context: LoggerContext): Logger | undefined {
  return context[LOGGER_CONTEXT_SYMBOL]
}
