import type { AnySchema } from '@orpc/contract'
import type { ConditionalSchemaConverter, JSONSchema, SchemaConvertOptions } from '@orpc/openapi'
import type { ConversionConfig } from '@valibot/to-json-schema'
import { toJsonSchema } from '@valibot/to-json-schema'

export interface experimental_ValibotToJsonSchemaConverterOptions extends Omit<ConversionConfig, 'typeMode'> {
}

export class experimental_ValibotToJsonSchemaConverter implements ConditionalSchemaConverter {
  private readonly conversionConfig: ConversionConfig

  constructor(options: experimental_ValibotToJsonSchemaConverterOptions = {}) {
    this.conversionConfig = {
      errorMode: 'ignore',
      ...options,
    }
  }

  condition(schema: AnySchema | undefined): boolean {
    return schema !== undefined && schema['~standard'].vendor === 'valibot'
  }

  convert(schema: AnySchema | undefined, options: SchemaConvertOptions): [required: boolean, jsonSchema: Exclude<JSONSchema, boolean>] {
    const jsonSchema = toJsonSchema(schema as any, {
      ...this.conversionConfig,
      typeMode: options.strategy,
    })

    return [true, jsonSchema as any]
  }
}
