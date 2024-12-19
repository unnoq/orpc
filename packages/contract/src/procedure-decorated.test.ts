import { z } from 'zod'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'

describe('decorate', () => {
  const procedure = new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined })

  it('works', () => {
    const decorated = DecoratedContractProcedure.decorate(procedure)
    expect(decorated).toBeInstanceOf(DecoratedContractProcedure)
    expect(decorated['~orpc']).toBe(procedure['~orpc'])
  })
})

describe('route', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined })

  it('works', () => {
    const route = { method: 'GET', path: '/path' } as const
    const routed = decorated.route(route)
    expect(routed).toBeInstanceOf(DecoratedContractProcedure)
    expect(routed['~orpc']).toEqual({ route })
  })

  it('not reference', () => {
    const routed = decorated.route({})
    expect(routed['~orpc']).not.toBe(decorated['~orpc'])
    expect(routed).not.toBe(decorated)
  })
})

describe('prefix', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined, route: { path: '/path' } })

  it('works', () => {
    const prefixed = decorated.prefix('/prefix')
    expect(prefixed).toBeInstanceOf(DecoratedContractProcedure)
    expect(prefixed['~orpc']).toEqual({ route: { path: '/prefix/path' } })
  })

  it('do nothing on non-path procedure', () => {
    const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined })
    const prefixed = decorated.prefix('/prefix')
    expect(prefixed).toBeInstanceOf(DecoratedContractProcedure)
    expect(prefixed['~orpc']).toEqual({ })
  })

  it('not reference', () => {
    const prefixed = decorated.prefix('/prefix')
    expect(prefixed['~orpc']).not.toBe(decorated['~orpc'])
    expect(prefixed).not.toBe(decorated)
  })
})

describe('unshiftTag', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined })

  it('works', () => {
    const tagged = decorated.unshiftTag('tag1', 'tag2')
    expect(tagged).toBeInstanceOf(DecoratedContractProcedure)
    expect(tagged['~orpc']).toEqual({ route: { tags: ['tag1', 'tag2'] } })

    const tagged2 = tagged.unshiftTag('tag3')
    expect(tagged2).toBeInstanceOf(DecoratedContractProcedure)
    expect(tagged2['~orpc']).toEqual({ route: { tags: ['tag3', 'tag1', 'tag2'] } })
  })

  it('not reference', () => {
    const tagged = decorated.unshiftTag('tag1', 'tag2')
    expect(tagged['~orpc']).not.toBe(decorated['~orpc'])
    expect(tagged).not.toBe(decorated)
  })

  it('prevent duplicate', () => {
    const tagged = decorated.unshiftTag('tag1', 'tag2')
    const tagged2 = tagged.unshiftTag('tag1', 'tag3')
    expect(tagged2['~orpc'].route?.tags).toEqual(['tag1', 'tag3', 'tag2'])
  })
})

describe('input', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined })
  const schema = z.object({
    value: z.string(),
  })
  const example = { value: 'example' }

  it('works', () => {
    const inputted = decorated.input(schema, example)
    expect(inputted).toBeInstanceOf(DecoratedContractProcedure)
    expect(inputted['~orpc']).toEqual({ InputSchema: schema, inputExample: example })
  })

  it('not reference', () => {
    const inputted = decorated.input(schema, example)
    expect(inputted['~orpc']).not.toBe(decorated['~orpc'])
    expect(inputted).not.toBe(decorated)
  })
})

describe('output', () => {
  const decorated = new DecoratedContractProcedure({ InputSchema: undefined, OutputSchema: undefined })
  const schema = z.object({
    value: z.string(),
  })
  const example = { value: 'example' }

  it('works', () => {
    const outputted = decorated.output(schema, example)
    expect(outputted).toBeInstanceOf(DecoratedContractProcedure)
    expect(outputted['~orpc']).toEqual({ OutputSchema: schema, outputExample: example })
  })

  it('not reference', () => {
    const outputted = decorated.output(schema, example)
    expect(outputted['~orpc']).not.toBe(decorated['~orpc'])
    expect(outputted).not.toBe(decorated)
  })
})
