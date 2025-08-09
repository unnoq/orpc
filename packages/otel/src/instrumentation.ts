import type { InstrumentationConfig, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation'
import { context, propagation, trace } from '@opentelemetry/api'
import { InstrumentationBase } from '@opentelemetry/instrumentation'
import { setGlobalOtelConfig } from '@orpc/shared'
import { ORPC_OTEL_PACKAGE_NAME, ORPC_OTEL_PACKAGE_VERSION } from './consts'

export interface ORPCInstrumentationConfig extends InstrumentationConfig {}

export class ORPCInstrumentation extends InstrumentationBase {
  constructor(config: ORPCInstrumentationConfig = {}) {
    super(ORPC_OTEL_PACKAGE_NAME, ORPC_OTEL_PACKAGE_VERSION, config)
  }

  protected override init(): InstrumentationModuleDefinition | InstrumentationModuleDefinition[] | void {
  }

  override enable(): void {
    setGlobalOtelConfig({
      tracer: trace.getTracer(ORPC_OTEL_PACKAGE_NAME, ORPC_OTEL_PACKAGE_VERSION),
      trace,
      context,
      propagation,
    })
  }

  override disable(): void {
    setGlobalOtelConfig(undefined)
  }
}
