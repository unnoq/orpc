import { z } from 'zod'
import { ContractBuilder } from './builder'
import { ContractProcedure } from './procedure'
import { DecoratedContractProcedure } from './procedure-decorated'
import { ContractRouterBuilder } from './router-builder'

vi.mock('./procedure-decorated', () => ({
  DecoratedContractProcedure: vi.fn(),
}))

vi.mock('./router-builder', () => ({
  ContractRouterBuilder: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('to ContractRouterBuilder', () => {
  const builder = new ContractBuilder()

  it('prefix', () => {
    expect(builder.prefix('/prefix')).toBeInstanceOf(ContractRouterBuilder)

    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      prefix: '/prefix',
    })
  })

  it('tag', () => {
    expect(builder.tag('tag1', 'tag2')).toBeInstanceOf(ContractRouterBuilder)

    expect(ContractRouterBuilder).toHaveBeenCalledWith({
      tags: ['tag1', 'tag2'],
    })
  })
})

describe('to DecoratedContractProcedure', () => {
  const builder = new ContractBuilder()

  it('route', () => {
    const route = { method: 'GET', path: '/path' } as const
    const procedure = builder.route(route)

    expect(procedure).toBeInstanceOf(DecoratedContractProcedure)
    expect(DecoratedContractProcedure).toHaveBeenCalledWith({ route })
  })

  const schema = z.object({
    value: z.string(),
  })
  const example = { value: 'example' }

  it('input', () => {
    const procedure = builder.input(schema, example)

    expect(procedure).toBeInstanceOf(DecoratedContractProcedure)
    expect(DecoratedContractProcedure).toHaveBeenCalledWith({ InputSchema: schema, inputExample: example })
  })

  it('output', () => {
    const procedure = builder.output(schema, example)

    expect(procedure).toBeInstanceOf(DecoratedContractProcedure)
    expect(DecoratedContractProcedure).toHaveBeenCalledWith({ OutputSchema: schema, outputExample: example })
  })
})

describe('to router', () => {
  const builder = new ContractBuilder()

  const router = {
    a: {
      b: {
        c: new ContractProcedure({ InputSchema: undefined, OutputSchema: undefined }),
      },
    },
  }

  const emptyRouter = {

  }

  it('router', () => {
    expect(builder.router(router)).toBe(router)
    expect(builder.router(emptyRouter)).toBe(emptyRouter)
  })
})
