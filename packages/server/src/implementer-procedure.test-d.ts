import type { Client } from '@orpc/client'
import type { AnySchema, ContractProcedure, ErrorFromErrorMap, ErrorMap } from '@orpc/contract'
import type { OmitChainMethodDeep } from '@orpc/shared'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Builder } from './builder'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { ImplementedProcedure, ProcedureImplementer } from './implementer-procedure'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { Procedure } from './procedure'
import type { ActionableClient, ActionableError } from './procedure-action'
import type { DecoratedProcedure } from './procedure-decorated'

const generalBuilder = {} as Builder<
  InitialContext,
  CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
>

const generalDecoratedProcedure = {} as DecoratedProcedure<
  InitialContext,
  CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
>

describe('ImplementedProcedure', () => {
  const implemented = {} as ImplementedProcedure<
    InitialContext,
    CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
      typeof generalDecoratedProcedure,
      'meta' | 'route' | 'errors'
    >

    expectTypeOf(implemented).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof implemented>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a procedure', () => {
    expectTypeOf(implemented).toMatchTypeOf<
      Procedure<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })

  describe('.use', () => {
    it('without map input', () => {
      const applied = implemented.use(({ context, next, path, procedure, errors }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        ImplementedProcedure<
          InitialContext & Omit<CurrentContext, keyof CurrentContext>,
          Omit<CurrentContext, 'extra'> & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()

      // @ts-expect-error --- invalid TInContext
      implemented.use({} as Middleware<{ auth: 'invalid' }, any, any, any, any, any>)
      // @ts-expect-error --- input is not match
      implemented.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      implemented.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
      // @ts-expect-error --- conflict context
      implemented.use(({ next }) => next({ context: { db: undefined } }))
    })

    it('with map input', () => {
      const applied = implemented.use(({ context, next, path, procedure, errors }, input: { mapped: string }, output) => {
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>>()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()

        return next({
          context: {
            extra: true,
          },
        })
      }, (input) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        return { mapped: input.input }
      })

      expectTypeOf(applied).toEqualTypeOf<
        ImplementedProcedure<
          InitialContext & Omit<CurrentContext, keyof CurrentContext>,
          Omit<CurrentContext, 'extra'> & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()

      // @ts-expect-error --- invalid TInContext
      implemented.use({} as Middleware<{ auth: 'invalid' }, any, any, any, any, any>, () => { })
      // @ts-expect-error --- input is not match
      implemented.use(({ next }, input: 'invalid') => next({}), () => {})
      // @ts-expect-error --- output is not match
      implemented.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}), () => {})
      // @ts-expect-error --- conflict context
      implemented.use(({ next }) => next({ context: { db: undefined } }), () => { })
    })

    it('with TInContext', () => {
      const mid = {} as Middleware<{ cacheable?: boolean } & Record<never, never>, Record<never, never>, unknown, any, ORPCErrorConstructorMap<any>, BaseMeta>

      expectTypeOf(implemented.use(mid)).toEqualTypeOf<
        ImplementedProcedure<
          InitialContext & { cacheable?: boolean },
          Omit<CurrentContext, never> & Record<never, never>,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()

      expectTypeOf(implemented.use(mid, () => { })).toEqualTypeOf<
        ImplementedProcedure<
          InitialContext & { cacheable?: boolean },
          Omit<CurrentContext, never> & Record<never, never>,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()
    })
  })

  it('.callable', () => {
    const applied = implemented.callable({
      context: async (clientContext: { batch?: boolean }) => ({ db: 'postgres' }),
    })

    expectTypeOf(applied).toEqualTypeOf<
      ImplementedProcedure<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
      & Client<{ batch?: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
    >()
  })

  it('.actionable', () => {
    const applied = implemented.actionable({
      context: async (clientContext: { batch?: boolean }) => ({ db: 'postgres' }),
    })

    expectTypeOf(applied).toEqualTypeOf<
      ImplementedProcedure<
        InitialContext,
        CurrentContext,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
      & ActionableClient<{ input: number }, { output: string }, ActionableError<ErrorFromErrorMap<typeof baseErrorMap>>>
    >()
  })
})

describe('ProcedureImplementer', () => {
  const builder = {} as ProcedureImplementer<
    InitialContext,
    CurrentContext,
    typeof inputSchema,
    typeof outputSchema,
    typeof baseErrorMap,
    BaseMeta
  >

  it('backward compatibility', () => {
    const expected = {} as OmitChainMethodDeep<
      typeof generalBuilder,
      '$config' | '$context' | '$meta' | '$route' | '$input' | 'middleware' | 'prefix' | 'tag' | 'router' | 'lazy' | 'input' | 'output' | 'meta' | 'route' | 'errors'
    >

    // expectTypeOf(builder).toMatchTypeOf(expected)
    expectTypeOf<keyof typeof builder>().toEqualTypeOf<keyof typeof expected>()
  })

  it('is a contract procedure', () => {
    expectTypeOf(builder).toMatchTypeOf<
      ContractProcedure<
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
      >
    >()
  })

  describe('.use', () => {
    it('without map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input, output) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureImplementer<
          InitialContext & Record<never, never>,
          Omit<CurrentContext, 'extra'> & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()

      // @ts-expect-error --- invalid TInContext
      builder.use({} as Middleware<{ auth: 'invalid' }, any, any, any, any, any>)
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
    })

    it('with map input', () => {
      const applied = builder.use(({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => {
        expectTypeOf(input).toEqualTypeOf<{ mapped: boolean }>()
        expectTypeOf(context).toEqualTypeOf<CurrentContext>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

        return next({
          context: {
            extra: true,
          },
        })
      }, (input) => {
        expectTypeOf(input).toEqualTypeOf<{ input: string }>()

        return { mapped: true }
      })

      expectTypeOf(applied).toEqualTypeOf<
        ProcedureImplementer<
          InitialContext & Record<never, never>,
          Omit<CurrentContext, 'extra'> & { extra: boolean },
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()

      builder.use(
        ({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => next(),
        // @ts-expect-error --- invalid map input
        input => ({ invalid: true }),
      )

      // @ts-expect-error --- invalid TInContext
      builder.use({} as Middleware<{ auth: 'invalid' }, any, any, any, any, any>, () => { })
      // @ts-expect-error --- input is not match
      builder.use(({ next }, input: 'invalid') => next({}), input => ({ mapped: true }))
      // @ts-expect-error --- output is not match
      builder.use(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}), input => ({ mapped: true }))
    })

    it('with TInContext', () => {
      const mid = {} as Middleware<{ cacheable?: boolean } & Record<never, never>, Record<never, never>, unknown, any, ORPCErrorConstructorMap<any>, BaseMeta>

      expectTypeOf(builder.use(mid)).toEqualTypeOf<
        ProcedureImplementer<
          InitialContext & { cacheable?: boolean },
          Omit<CurrentContext, never> & Record<never, never>,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()

      expectTypeOf(builder.use(mid, () => { })).toEqualTypeOf<
        ProcedureImplementer<
          InitialContext & { cacheable?: boolean },
          Omit<CurrentContext, never> & Record<never, never>,
          typeof inputSchema,
          typeof outputSchema,
          typeof baseErrorMap,
          BaseMeta
        >
      >()
    })
  })

  it('.handler', () => {
    const procedure = builder.handler(({ input, context, procedure, path, signal, errors }) => {
      expectTypeOf(input).toEqualTypeOf<{ input: string }>()
      expectTypeOf(context).toEqualTypeOf<CurrentContext>()
      expectTypeOf(path).toEqualTypeOf<readonly string[]>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()
      expectTypeOf(procedure).toEqualTypeOf<
        Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
      >()
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
      expectTypeOf(signal).toEqualTypeOf<undefined | InstanceType<typeof AbortSignal>>()

      return { output: 456 }
    })

    expectTypeOf(procedure).toMatchTypeOf<
      ImplementedProcedure<
        InitialContext,
        CurrentContext,
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()

    // @ts-expect-error --- invalid output
    builder.handler(() => ({ output: 'invalid' }))
  })
})
