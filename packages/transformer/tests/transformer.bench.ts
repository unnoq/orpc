import { bench } from 'vitest'
import { z } from 'zod'
import { ORPCTransformer, OpenAPITransformer } from '../src'

describe('simple data', () => {
  const data = {
    string: 'string',
    number: 1234,
    boolean: true,
    null: null,
    undefined: undefined,
    bigint: BigInt(1234),
    date: new Date('2023-01-01'),
    map: new Map([
      [1, 2],
      [3, 4],
    ]),
    set: new Set([1, 2, 3]),
    array: [1, 2, 3],
    object: {
      a: 1,
      b: 2,
      c: 3,
    },
  }

  const schema = z.object({
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
    null: z.null(),
    undefined: z.undefined(),
    bigint: z.bigint(),
    date: z.date(),
    map: z.map(z.number(), z.number()),
    set: z.set(z.number()),
    array: z.array(z.number()),
    object: z.object({
      a: z.number(),
      b: z.number(),
      c: z.number(),
    }),
  })

  const orpcTransformer = new ORPCTransformer()
  const openapiTransformer = new OpenAPITransformer({ schema })

  bench('ORPCTransformer', () => {
    orpcTransformer.deserialize(
      new Request('http://localhost', {
        method: 'POST',
        ...orpcTransformer.serialize(data),
      }),
    )
  })

  bench('OpenAPITransformer', () => {
    openapiTransformer.deserialize(
      new Request('http://localhost', {
        method: 'POST',
        ...openapiTransformer.serialize(data),
      }),
    )
  })
})

describe('with file', () => {
  const data = {
    string: 'string',
    number: 1234,
    boolean: true,
    null: null,
    undefined: undefined,
    bigint: BigInt(1234),
    date: new Date('2023-01-01'),
    map: new Map([
      [1, 2],
      [3, 4],
    ]),
    set: new Set([1, 2, 3]),
    array: [1, 2, 3],
    object: {
      a: 1,
      b: 2,
      c: 3,
    },
    file: new File(['"name"'], 'file.json', {
      type: 'application/json',
    }),
  }

  const schema = z.object({
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
    null: z.null(),
    undefined: z.undefined(),
    bigint: z.bigint(),
    date: z.date(),
    map: z.map(z.number(), z.number()),
    set: z.set(z.number()),
    array: z.array(z.number()),
    object: z.object({
      a: z.number(),
      b: z.number(),
      c: z.number(),
    }),
    file: z.instanceof(File),
  })

  const orpcTransformer = new ORPCTransformer()
  const openapiTransformer = new OpenAPITransformer({ schema })

  bench('ORPCTransformer', () => {
    orpcTransformer.deserialize(
      new Request('http://localhost', {
        method: 'POST',
        ...orpcTransformer.serialize(data),
      }),
    )
  })

  bench('OpenAPITransformer', () => {
    openapiTransformer.deserialize(
      new Request('http://localhost', {
        method: 'POST',
        ...openapiTransformer.serialize(data),
      }),
    )
  })
})

describe('with unions', () => {
  const data = {
    object: {
      a: BigInt(1234),
      b: new Date('2023-01-01'),
      c: new Map([
        [1, 2],
        [3, 4],
      ]),
      file: new File(['"name"'], 'file.json', {
        type: 'application/json',
      }),
    },
  }

  const schema = z.object({
    object: z.union([
      z.object({
        a: z.bigint(),
        b: z.date(),
        c: z.map(z.number(), z.number()),
        file: z.instanceof(File),
      }),
      z.object({
        a: z.number(),
        b: z.number(),
        c: z.number(),
      }),
    ]),
  })

  const orpcTransformer = new ORPCTransformer()
  const openapiTransformer = new OpenAPITransformer({ schema })

  bench('ORPCTransformer', () => {
    orpcTransformer.deserialize(
      new Request('http://localhost', {
        method: 'POST',
        ...orpcTransformer.serialize(data),
      }),
    )
  })

  bench('OpenAPITransformer', () => {
    openapiTransformer.deserialize(
      new Request('http://localhost', {
        method: 'POST',
        ...openapiTransformer.serialize(data),
      }),
    )
  })
})