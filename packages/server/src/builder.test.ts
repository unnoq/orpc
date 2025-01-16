import { oc } from '@orpc/contract'
import { z } from 'zod'
import { Builder } from './builder'
import { BuilderWithErrors } from './builder-with-errors'
import { BuilderWithMiddlewares } from './builder-with-middlewares'
import * as implementerChainable from './implementer-chainable'
import { unlazy } from './lazy'
import * as middlewareDecorated from './middleware-decorated'
import { ProcedureBuilder } from './procedure-builder'
import { ProcedureBuilderWithInput } from './procedure-builder-with-input'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

const decorateMiddlewareSpy = vi.spyOn(middlewareDecorated, 'decorateMiddleware')
const RouterBuilderRouterSpy = vi.spyOn(RouterBuilder.prototype, 'router')
const RouterBuilderLazySpy = vi.spyOn(RouterBuilder.prototype, 'lazy')
const createChainableImplementerSpy = vi.spyOn(implementerChainable, 'createChainableImplementer')

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const errors = {
  CODE: {
    status: 404,
    data: z.object({ why: z.string() }),
  },
}

const builder = new Builder({})

describe('builder', () => {
  it('.context', () => {
    const applied = builder.context()
    expect(applied).toBe(builder)
  })

  it('.middleware', () => {
    const fn = vi.fn()
    const mid = builder.middleware(fn)

    expect(mid).toBe(decorateMiddlewareSpy.mock.results[0]!.value)
    expect(decorateMiddlewareSpy).toHaveBeenCalledWith(fn)
  })

  it('.errors', () => {
    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(BuilderWithErrors)
    expect(applied['~orpc'].errorMap).toEqual(errors)
  })

  it('.use', () => {
    const mid = vi.fn()
    const applied = builder.use(mid)
    expect(applied).toBeInstanceOf(BuilderWithMiddlewares)
    expect(applied['~orpc'].middlewares).toEqual([mid])
    expect(applied['~orpc'].inputValidationIndex).toEqual(1)
    expect(applied['~orpc'].outputValidationIndex).toEqual(1)
  })

  it('.route', () => {
    const route = { path: '/test', method: 'GET' } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied['~orpc'].contract['~orpc'].route).toEqual(route)
    expect(applied['~orpc'].inputValidationIndex).toEqual(0)
    expect(applied['~orpc'].outputValidationIndex).toEqual(0)
  })

  it('.input', () => {
    const applied = builder.input(schema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithInput)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(schema)
    expect(applied['~orpc'].inputValidationIndex).toEqual(0)
    expect(applied['~orpc'].outputValidationIndex).toEqual(0)
  })

  it('.output', () => {
    const applied = builder.output(schema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)
    expect(applied['~orpc'].contract['~orpc'].OutputSchema).toEqual(schema)
    expect(applied['~orpc'].inputValidationIndex).toEqual(0)
    expect(applied['~orpc'].outputValidationIndex).toEqual(0)
  })

  it('.handler', () => {
    const handler = vi.fn()
    const applied = builder.handler(handler)
    expect(applied).toBeInstanceOf(DecoratedProcedure)
    expect(applied['~orpc'].handler).toEqual(handler)
    expect(applied['~orpc'].inputValidationIndex).toEqual(0)
    expect(applied['~orpc'].outputValidationIndex).toEqual(0)
  })

  it('.prefix', () => {
    const applied = builder.prefix('/test')
    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc'].prefix).toEqual('/test')
  })

  it('.tag', () => {
    const applied = builder.tag('test', 'test2')
    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(applied['~orpc'].tags).toEqual(['test', 'test2'])
  })

  it('.router', () => {
    const router = {
      ping: {} as any,
      pong: {} as any,
    }

    const applied = builder.router(router)

    expect(applied).toBe(RouterBuilderRouterSpy.mock.results[0]!.value)
    expect(RouterBuilderRouterSpy).toHaveBeenCalledWith(router)
  })

  it('.lazy', () => {
    const router = {
      ping: {} as any,
      pong: {} as any,
    }

    const applied = builder.lazy(() => Promise.resolve({ default: router }))

    expect(applied).toBe(RouterBuilderLazySpy.mock.results[0]!.value)
    expect(RouterBuilderLazySpy).toHaveBeenCalledWith(expect.any(Function))
    expect(unlazy(RouterBuilderLazySpy.mock.results[0]!.value)).resolves.toEqual({ default: router })
  })

  it('.contract', () => {
    const contract = oc.router({
      ping: oc.input(schema).output(schema),
    })

    const applied = builder.contract(contract)

    expect(applied).toBe(createChainableImplementerSpy.mock.results[0]!.value)
    expect(createChainableImplementerSpy).toHaveBeenCalledWith(contract, {
      middlewares: [],
      inputValidationIndex: 0,
      outputValidationIndex: 0,
    })
  })
})
