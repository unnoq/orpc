import type { AnySchema, JsonSchema, JsonSchemaConverter, JsonSchemaConverterDirection } from '@orpc/json-schema'
import type { ConversionConfig, JsonSchema as ValibotJsonSchema } from '@valibot/to-json-schema'
import type { BaseSchema, MapSchema, SetSchema } from 'valibot'
import { JsonSchemaFormat, JsonSchemaXNativeType } from '@orpc/json-schema'
import { toJsonSchema } from '@valibot/to-json-schema'

export interface ValibotToJsonSchemaConverterOptions extends Omit<ConversionConfig, 'target' | 'typeMode' | 'overrideRef'> {
  /**
   * Caches conversion results in a WeakMap keyed by the Valibot schema instance,
   * so converting the same schema again is free.
   *
   * When enabled, repeated conversions return the same JSON schema object,
   * so treat returned schemas as immutable.
   *
   * @default false
   */
  cache?: boolean
}

export class ValibotToJsonSchemaConverter implements JsonSchemaConverter {
  private readonly conversionConfig: ConversionConfig
  private readonly cache: undefined | { [d in JsonSchemaConverterDirection]: WeakMap<BaseSchema<any, any, any>, [jsonSchema: JsonSchema, optional: boolean]> }

  constructor(
    { cache, ...conversionConfig }: ValibotToJsonSchemaConverterOptions = {},
  ) {
    this.conversionConfig = conversionConfig

    if (cache) {
      this.cache = { input: new WeakMap(), output: new WeakMap() }
    }
  }

  condition(schema: AnySchema | undefined, _direction: JsonSchemaConverterDirection): boolean {
    return schema?.['~standard'].vendor === 'valibot'
  }

  convert(schema: AnySchema | undefined, direction: JsonSchemaConverterDirection): [jsonSchema: JsonSchema, optional: boolean] {
    const valibotSchema = schema as BaseSchema<any, any, any>

    if (this.cache) {
      const cached = this.cache[direction].get(valibotSchema)
      if (cached) {
        return cached
      }
    }

    const result = this.convertUncached(valibotSchema, direction)

    if (this.cache) {
      this.cache[direction].set(valibotSchema, result)
    }

    return result
  }

  private convertUncached(valibotSchema: BaseSchema<any, any, any>, direction: JsonSchemaConverterDirection): [jsonSchema: JsonSchema, optional: boolean] {
    const jsonSchema = this.convertValibot(valibotSchema, direction)

    let optional = false
    try {
      const result = valibotSchema['~standard'].validate(undefined)
      if (!(result instanceof Promise) && !result.issues) {
        optional = direction === 'input' ? true : result.value === undefined
      }
    }
    catch {}

    return [jsonSchema as JsonSchema, optional]
  }

  private convertValibot(schema: BaseSchema<any, any, any>, direction: JsonSchemaConverterDirection): ValibotJsonSchema {
    const jsonSchema = toJsonSchema(schema, {
      errorMode: 'ignore',
      ...this.conversionConfig,
      target: 'draft-2020-12',
      typeMode: direction,
      overrideSchema: (context) => {
        if (context.valibotSchema.type === 'bigint') {
          context.jsonSchema.type = 'string'
          context.jsonSchema.pattern = '^-?[0-9]+$'
          ;(context.jsonSchema as any)['x-native-type'] = JsonSchemaXNativeType.BigInt
        }
        else if (context.valibotSchema.type === 'date') {
          context.jsonSchema.type = 'string'
          context.jsonSchema.format = JsonSchemaFormat.DateTime
          ;(context.jsonSchema as any)['x-native-type'] = JsonSchemaXNativeType.Date
        }
        else if (context.valibotSchema.type === 'set') {
          const setSchema = context.valibotSchema as SetSchema<BaseSchema<any, any, any>, any>
          context.jsonSchema.type = 'array'
          context.jsonSchema.uniqueItems = true
          context.jsonSchema.items = this.convertValibot(setSchema.value, direction)
          ;(context.jsonSchema as any)['x-native-type'] = JsonSchemaXNativeType.Set
        }
        else if (context.valibotSchema.type === 'map') {
          const mapSchema = context.valibotSchema as MapSchema<BaseSchema<any, any, any>, BaseSchema<any, any, any>, any>

          context.jsonSchema.type = 'array'
          context.jsonSchema.items = {
            type: 'array',
            prefixItems: [
              this.convertValibot(mapSchema.key, direction),
              this.convertValibot(mapSchema.value, direction),
            ],
            maxItems: 2,
            minItems: 2,
          }
          ;(context.jsonSchema as any)['x-native-type'] = JsonSchemaXNativeType.Map
        }

        if (this.conversionConfig.overrideSchema) {
          return this.conversionConfig.overrideSchema(context)
        }
      },
    })

    // Since the default oRPC format is always draft/2020-12,
    // `$schema` can be safely omitted here.
    const { $schema, ...rest } = jsonSchema
    return rest
  }
}
