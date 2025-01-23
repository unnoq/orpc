import { baseErrorMap, baseMeta, baseRoute, inputSchema, outputSchema } from '../../contract/tests/shared'
import { ProcedureBuilderWithOutput } from './procedure-builder-with-output'
import { ProcedureBuilderWithoutHandler } from './procedure-builder-without-handler'

const mid = vi.fn()

const def = {
  middlewares: [mid],
  inputValidationIndex: 1,
  outputValidationIndex: 1,
  inputSchema: undefined,
  outputSchema,
  errorMap: baseErrorMap,
  route: baseRoute,
  meta: baseMeta as any,
}

const builder = new ProcedureBuilderWithOutput(def)

describe('procedureBuilderWithOutput', () => {
  it('.errors', () => {
    const errors = { CODE: { message: 'MESSAGE' } }

    const applied = builder.errors(errors)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      errorMap: {
        ...def.errorMap,
        ...errors,
      },
    })
  })

  it('.meta', () => {
    const meta = { mode: 'TEST-DDD' } as const

    const applied = builder.meta(meta)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      meta: {
        ...def.meta,
        ...meta,
      },
    })
  })

  it('.route', () => {
    const route = { method: 'DELETE', tag: ['ua'] } as const

    const applied = builder.route(route)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      route: {
        ...def.route,
        ...route,
      },
    })
  })

  it('.use', () => {
    const mid = vi.fn()

    const applied = builder.use(mid)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithOutput)
    expect(applied).not.toBe(builder)

    expect(applied['~orpc']).toEqual({
      ...def,
      middlewares: [
        ...def.middlewares,
        mid,
      ],
      inputValidationIndex: 2,
      outputValidationIndex: 1,
    })
  })

  it('.input', () => {
    const applied = builder.input(inputSchema)
    expect(applied).toBeInstanceOf(ProcedureBuilderWithoutHandler)

    expect(applied['~orpc']).toEqual({
      ...def,
      inputSchema,
    })
  })

  it('.handler', () => {
    const handler = vi.fn()
    const applied = builder.handler(handler)

    expect(applied['~orpc']).toEqual({
      ...def,
      handler,
    })
  })
})
