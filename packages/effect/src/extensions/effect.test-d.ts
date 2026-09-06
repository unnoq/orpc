import type { Schema } from '@orpc/contract'
import type { Builder, BuilderWithInput, BuilderWithInputOutput, BuilderWithMiddlewares, BuilderWithOutput, DecoratedProcedure, ORPCErrorConstructorMap } from '@orpc/server'
import { ORPCError } from '@orpc/server'
import { Effect } from 'effect'
import { z } from 'zod'
import './effect'
import '@orpc/server/extensions/callable' // not sure why, but we need import this to make type work

const errorMap = {
  BASE: {
    data: z.object({ id: z.string() }),
    message: 'base',
  },
}

const schema1 = z.object({ schema1: z.number().transform(n => `${n}`) })
const schema2 = z.object({ schema2: z.number().transform(n => `${n}`) })

describe('adds .effect into Builder', async () => {
  const builder = {} as Builder<{ auth: boolean }, typeof errorMap>

  it('simple', () => {
    expectTypeOf(builder.effect(function* ({ errors, context }, input) {
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof errorMap>>()
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()

      return 'out'
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        object,
        Schema<void, unknown>,
        Schema<string>,
        typeof errorMap
      >
    >()
  })

  it('treats returned ORPCError as output and does not infer failed ORPCError', () => {
    expectTypeOf(builder.effect(function* () {
      // use error that has properties that ORPCError doesn't have.
      yield* Effect.fail({ _tags: 'e', non_exists_in_ORPCError: 'abc' })
      yield* Effect.fail(new ORPCError('CONFLICT', { data: 123 }))

      if (Math.random() > 0.5) {
        return new ORPCError('BAD_REQUEST', { data: 'data' })
      }

      return 'out'
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        object,
        Schema<void, unknown>,
        Schema<'out' | ORPCError<'BAD_REQUEST', string>>,
        typeof errorMap
      >
    >()
  })
})

describe('adds .effect into BuilderWithMiddlewares', async () => {
  const builder = {} as BuilderWithMiddlewares<{ auth: boolean }, { extra: boolean }, typeof errorMap>

  it('simple', () => {
    expectTypeOf(builder.effect(function* ({ errors, context }, input) {
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof errorMap>>()
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { extra: boolean }>()

      return 'out'
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { extra: boolean },
        Schema<void, unknown>,
        Schema<string>,
        typeof errorMap
      >
    >()
  })

  it('treats returned ORPCError as output and does not infer failed ORPCError', () => {
    expectTypeOf(builder.effect(function* () {
      // use error that has properties that ORPCError doesn't have.
      yield* Effect.fail({ _tags: 'e', non_exists_in_ORPCError: 'abc' })
      yield* Effect.fail(new ORPCError('CONFLICT', { data: 123 }))

      if (Math.random() > 0.5) {
        return new ORPCError('BAD_REQUEST', { data: 'data' })
      }

      return 'out'
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { extra: boolean },
        Schema<void, unknown>,
        Schema<'out' | ORPCError<'BAD_REQUEST', string>>,
        typeof errorMap
      >
    >()
  })
})

describe('adds .effect into BuilderWithInput', async () => {
  const builder = {} as BuilderWithInput<{ auth: boolean }, { extra: boolean }, typeof schema1, typeof errorMap>

  it('simple', () => {
    expectTypeOf(builder.effect(function* ({ errors, context }, input) {
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof errorMap>>()
      expectTypeOf(input).toEqualTypeOf<{ schema1: string }>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { extra: boolean }>()

      return 'out'
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { extra: boolean },
        typeof schema1,
        Schema<string>,
        typeof errorMap
      >
    >()
  })

  it('treats returned ORPCError as output and does not infer failed ORPCError', () => {
    expectTypeOf(builder.effect(function* () {
      // use error that has properties that ORPCError doesn't have.
      yield* Effect.fail({ _tags: 'e', non_exists_in_ORPCError: 'abc' })
      yield* Effect.fail(new ORPCError('CONFLICT', { data: 123 }))

      if (Math.random() > 0.5) {
        return new ORPCError('BAD_REQUEST', { data: 'data' })
      }

      return 'out'
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { extra: boolean },
        typeof schema1,
        Schema<'out' | ORPCError<'BAD_REQUEST', string>>,
        typeof errorMap
      >
    >()
  })
})

describe('adds .effect into BuilderWithOutput', async () => {
  const builder = {} as BuilderWithOutput<{ auth: boolean }, { extra: boolean }, typeof schema2, typeof errorMap>

  it('simple', () => {
    expectTypeOf(builder.effect(function* ({ errors, context }, input) {
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof errorMap>>()
      expectTypeOf(input).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { extra: boolean }>()

      return { schema2: 123 }
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { extra: boolean },
        Schema<void, unknown>,
        typeof schema2,
        typeof errorMap
      >
    >()

    // @ts-expect-error - output is invalid
    void builder.effect(function* ({ errors, context }, input) {
      return 'invalid'
    })
  })

  it('does not allow returning ORPCError', () => {
    // @ts-expect-error - ORPCError is not a valid output
    void builder.effect(function* () {
      yield* Effect.fail(new ORPCError('CONFLICT', { data: 123 }))

      if (Math.random() > 0.5) {
        return new ORPCError('BAD_REQUEST', { data: 'data' })
      }

      return { schema2: 123 }
    })
  })
})

describe('adds .effect into BuilderWithInputOutput', async () => {
  const builder = {} as BuilderWithInputOutput<{ auth: boolean }, { extra: boolean }, typeof schema1, typeof schema2, typeof errorMap>

  it('simple', () => {
    expectTypeOf(builder.effect(function* ({ errors, context }, input) {
      expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof errorMap>>()
      expectTypeOf(input).toEqualTypeOf<{ schema1: string }>()
      expectTypeOf(context).toEqualTypeOf<{ auth: boolean } & { extra: boolean }>()

      return { schema2: 123 }
    })).toEqualTypeOf<
      DecoratedProcedure<
        { auth: boolean },
        { extra: boolean },
        typeof schema1,
        typeof schema2,
        typeof errorMap
      >
    >()

    // @ts-expect-error - output is invalid
    void builder.effect(function* ({ errors, context }, input) {
      return 'invalid'
    })
  })

  it('does not allow returning ORPCError', () => {
    // @ts-expect-error - ORPCError is not a valid output
    void builder.effect(function* () {
      yield* Effect.fail(new ORPCError('CONFLICT', { data: 123 }))

      if (Math.random() > 0.5) {
        return new ORPCError('BAD_REQUEST', { data: 'data' })
      }

      return { schema2: 123 }
    })
  })
})
