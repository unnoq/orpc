import type { InstrumentationConfig, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation'
// eslint-disable-next-line no-restricted-imports
import { context, propagation, trace } from '@opentelemetry/api'
import { InstrumentationBase } from '@opentelemetry/instrumentation'
import { setOpenTelemetryConfig } from '@orpc/shared'
import pkg from '../package.json'

export interface ORPCInstrumentationConfig extends InstrumentationConfig {
  /**
   * Whether to enable automatic OpenTelemetry context/span propagation.
   *
   * Disable this if propagation is handled elsewhere or managed manually.
   *
   * @default true
   */
  propagationEnabled?: boolean
}

/**
 * OpenTelemetry instrumentation for oRPC. Automatically instruments both
 * client and server for distributed tracing.
 *
 * @see {@link https://orpc.dev/docs/integrations/opentelemetry | OpenTelemetry Integration}
 */
export class ORPCInstrumentation extends InstrumentationBase<ORPCInstrumentationConfig> {
  constructor(config: ORPCInstrumentationConfig = {}) {
    super(pkg.name, pkg.version, config)
  }

  protected override init(): InstrumentationModuleDefinition | InstrumentationModuleDefinition[] | void {
  }

  override enable(): void {
    setOpenTelemetryConfig({
      tracer: trace.getTracer(pkg.name, pkg.version),
      trace,
      context,
      propagation: (this._config.propagationEnabled ?? true) ? propagation : undefined,
    })
  }

  override disable(): void {
    setOpenTelemetryConfig(undefined)
  }
}
