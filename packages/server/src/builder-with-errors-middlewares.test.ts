import { z } from 'zod'
import { BuilderWithErrorsMiddlewares } from './builder-with-errors-middlewares'
import { unlazy } from './lazy'
import { ProcedureBuilder } from './procedure-builder'
import { DecoratedProcedure } from './procedure-decorated'
import { RouterBuilder } from './router-builder'

vi.mock('./router-builder', async (origin) => {
  const RouterBuilder = vi.fn()
  RouterBuilder.prototype.router = vi.fn(() => '__router__')
  RouterBuilder.prototype.lazy = vi.fn(() => '__lazy__')

  return {
    RouterBuilder,
  }
})

const RouterBuilderRouterSpy = vi.spyOn(RouterBuilder.prototype, 'router')
const RouterBuilderLazySpy = vi.spyOn(RouterBuilder.prototype, 'lazy')

const schema = z.object({ val: z.string().transform(v => Number.parseInt(v)) })

const errors = {
  CODE: {
    status: 404,
    data: z.object({ why: z.string() }),
  },
}

const baseErrors = {
  BASE: {
    status: 404,
    data: z.object({ why: z.string() }),
  },
}

const mid = vi.fn()

const builder = new BuilderWithErrorsMiddlewares({
  middlewares: [mid],
  errorMap: baseErrors,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('builder', () => {
  it('.errors', () => {
    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(BuilderWithErrorsMiddlewares)
    expect(applied['~orpc'].errorMap).toEqual({ ...baseErrors, ...errors })
  })

  it('.use', () => {
    const mid2 = vi.fn()
    const applied = builder.use(mid2)
    expect(applied).toBeInstanceOf(BuilderWithErrorsMiddlewares)
    expect(applied['~orpc'].errorMap).toEqual(baseErrors)
    expect(applied['~orpc'].middlewares).toEqual([mid, mid2])
  })

  it('.route', () => {
    const route = { path: '/test', method: 'GET' } as const
    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied['~orpc'].contract['~orpc'].route).toEqual(route)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(applied['~orpc'].middlewares).toEqual([mid])
  })

  it('.input', () => {
    const applied = builder.input(schema)
    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied['~orpc'].contract['~orpc'].InputSchema).toEqual(schema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(applied['~orpc'].middlewares).toEqual([mid])
  })

  it('.output', () => {
    const applied = builder.output(schema)
    expect(applied).toBeInstanceOf(ProcedureBuilder)
    expect(applied['~orpc'].contract['~orpc'].OutputSchema).toEqual(schema)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(applied['~orpc'].middlewares).toEqual([mid])
  })

  it('.handler', () => {
    const handler = vi.fn()
    const applied = builder.handler(handler)
    expect(applied).toBeInstanceOf(DecoratedProcedure)
    expect(applied['~orpc'].handler).toEqual(handler)
    expect(applied['~orpc'].contract['~orpc'].errorMap).toEqual(baseErrors)
    expect(applied['~orpc'].preMiddlewares).toEqual([mid])
  })

  it('.prefix', () => {
    const applied = builder.prefix('/test')
    expect(applied).toBe(vi.mocked(RouterBuilder).mock.results[0]!.value)
    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(RouterBuilder).toHaveBeenCalledWith(expect.objectContaining({
      middlewares: [mid],
      errorMap: baseErrors,
      prefix: '/test',
    }))
  })

  it('.tag', () => {
    const applied = builder.tag('test', 'test2')
    expect(applied).toBe(vi.mocked(RouterBuilder).mock.results[0]!.value)
    expect(applied).toBeInstanceOf(RouterBuilder)
    expect(RouterBuilder).toHaveBeenCalledWith(expect.objectContaining({
      middlewares: [mid],
      errorMap: baseErrors,
      tags: ['test', 'test2'],
    }))
  })

  it('.router', () => {
    const router = {
      ping: {} as any,
      pong: {} as any,
    }

    const applied = builder.router(router)

    expect(applied).toBe(RouterBuilderRouterSpy.mock.results[0]!.value)
    expect(RouterBuilderRouterSpy).toHaveBeenCalledWith(router)
    expect(RouterBuilder).toHaveBeenCalledWith(expect.objectContaining({
      middlewares: [mid],
      errorMap: baseErrors,
    }))
  })

  it('.lazy', () => {
    const router = {
      ping: {} as any,
      pong: {} as any,
    }

    const applied = builder.lazy(() => Promise.resolve({ default: router }))

    expect(applied).toBe(RouterBuilderLazySpy.mock.results[0]!.value)
    expect(RouterBuilderLazySpy).toHaveBeenCalledWith(expect.any(Function))
    expect(RouterBuilder).toHaveBeenCalledWith(expect.objectContaining({
      middlewares: [mid],
      errorMap: baseErrors,
    }))
    expect(unlazy(RouterBuilderLazySpy.mock.results[0]!.value)).resolves.toEqual({ default: '__lazy__' })
  })
})
