import { toJsonSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'
import * as z from 'zod'
import { ValibotToJsonSchemaConverter } from './converter'

vi.mock('@valibot/to-json-schema', async (original) => {
  const mod = await original<typeof import('@valibot/to-json-schema')>()
  return {
    ...mod,
    toJsonSchema: vi.fn((...args: [any]) => mod.toJsonSchema(...args)),
  }
})

describe('valibotToJsonSchemaConverter', () => {
  const converter = new ValibotToJsonSchemaConverter()

  describe('.condition', () => {
    it.each([
      ['valibot input schema', v.string(), 'input', true],
      ['valibot output schema', v.optional(v.string()), 'output', true],
      ['non-valibot schema', z.string() as never, 'input', false],
      ['undefined schema', undefined, 'output', false],
    ] as const)('matches %s', (_, schema, direction, expected) => {
      expect(converter.condition(schema, direction)).toBe(expected)
    })
  })

  it.each([
    ['input', { type: 'number' }],
    ['output', { type: 'string' }],
  ] as const)('uses the requested %s direction when generating json schema', (direction, jsonSchema) => {
    expect(converter.convert(v.pipe(v.number(), v.transform(n => n.toString()), v.string()), direction)).toEqual([jsonSchema, false])
  })

  it('forwards extended toJsonSchema options from the constructor', () => {
    const converter = new ValibotToJsonSchemaConverter({
      overrideSchema: ({ jsonSchema }) => ({
        ...jsonSchema,
        description: 'root-schema',
      }),
    })

    expect(converter.convert(v.string(), 'input')).toEqual([
      {
        description: 'root-schema',
        type: 'string',
      },
      false,
    ])
  })

  it('keeps converting when standard validation throws while checking optionality', () => {
    const schema = v.string()

    Object.defineProperty(schema, '~standard', {
      value: {
        ...schema['~standard'],
        validate: () => {
          throw new Error('validate failed')
        },
      },
    })

    expect(converter.convert(schema, 'input')).toEqual([{ type: 'string' }, false])
  })

  describe('optionality', () => {
    it.each([
      ['defaulted input schema', v.optional(v.string(), 'fallback'), 'input', {
        default: 'fallback',
        type: 'string',
      }, true],
      ['defaulted output schema', v.optional(v.string(), 'fallback'), 'output', {
        default: 'fallback',
        type: 'string',
      }, false],
      ['undefined-producing output schema', v.optional(v.string()), 'output', {
        type: 'string',
      }, true],
      ['required input schema', v.string(), 'input', {
        type: 'string',
      }, false],
      ['required output schema', v.string(), 'output', {
        type: 'string',
      }, false],
    ] as const)('marks %s correctly', (_, schema, direction, jsonSchema, optional) => {
      expect(converter.convert(schema, direction)).toEqual([jsonSchema, optional])
    })
  })

  describe('native type extensions', () => {
    it.each([
      [v.bigint(), {
        'type': 'string',
        'x-native-type': 'bigint',
        'pattern': '^-?[0-9]+$',
      }],
      [v.date(), {
        'type': 'string',
        'x-native-type': 'date',
        'format': 'date-time',
      }],
      [v.set(v.string()), {
        'type': 'array',
        'x-native-type': 'set',
        'uniqueItems': true,
        'items': { type: 'string' },
      }],
      [v.map(v.string(), v.number()), {
        'type': 'array',
        'x-native-type': 'map',
        'items': {
          type: 'array',
          prefixItems: [
            { type: 'string' },
            { type: 'number' },
          ],
          maxItems: 2,
          minItems: 2,
        },
      }],
    ] as const)('extends conversion for %s', (schema, jsonSchema) => {
      expect(converter.convert(schema, 'input')).toEqual([jsonSchema, false])
    })
  })

  describe('cache option', () => {
    const schema = v.pipe(v.number(), v.transform(n => n.toString()), v.string())

    it('reuses conversion results per schema and direction when enabled', () => {
      const converter = new ValibotToJsonSchemaConverter({ cache: true })

      vi.mocked(toJsonSchema).mockClear()

      const input = converter.convert(schema, 'input')
      expect(input).toEqual([{ type: 'number' }, false])
      expect(converter.convert(schema, 'input')).toBe(input)
      expect(toJsonSchema).toHaveBeenCalledTimes(1)

      const output = converter.convert(schema, 'output')
      expect(output).toEqual([{ type: 'string' }, false])
      expect(output).not.toBe(input)
      expect(converter.convert(schema, 'output')).toBe(output)
      expect(toJsonSchema).toHaveBeenCalledTimes(2)

      converter.convert(v.string(), 'input')
      expect(toJsonSchema).toHaveBeenCalledTimes(3)
    })

    it('converts on every call when disabled', () => {
      vi.mocked(toJsonSchema).mockClear()

      const first = converter.convert(schema, 'input')
      const second = converter.convert(schema, 'input')

      expect(second).toEqual(first)
      expect(second).not.toBe(first)
      expect(toJsonSchema).toHaveBeenCalledTimes(2)
    })
  })
})
