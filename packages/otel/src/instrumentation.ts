import type { InstrumentationConfig, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation'
import { trace } from '@opentelemetry/api'
import { InstrumentationBase } from '@opentelemetry/instrumentation'
import { setTracer } from '@orpc/shared'
import { ORPC_OTEL_PACKAGE_NAME, ORPC_OTEL_PACKAGE_VERSION } from './consts'

export interface ORPCInstrumentationConfig extends InstrumentationConfig {}

export class ORPCInstrumentation extends InstrumentationBase {
  constructor(config: ORPCInstrumentationConfig = {}) {
    super(ORPC_OTEL_PACKAGE_NAME, ORPC_OTEL_PACKAGE_VERSION, config)
  }

  protected override init(): InstrumentationModuleDefinition | InstrumentationModuleDefinition[] | void {
  }

  override enable(): void {
    setTracer(trace.getTracer(ORPC_OTEL_PACKAGE_NAME, ORPC_OTEL_PACKAGE_VERSION))
  }
}
