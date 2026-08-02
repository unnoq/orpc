import type { ORPCError } from '@orpc/server'
import { Effect } from 'effect'
import { catchORPCError, catchORPCErrorByCode } from './error'

class Service1 {
  declare id: 'Service1'
}

class Service2 {
  declare id: 'Service2'
}

const effect = {} as Effect.Effect<
  'output',
  ORPCError<'NOT_FOUND', { id: string }> | ORPCError<'CONFLICT', number> | TypeError,
  Service1
>

describe('catchORPCError', () => {
  it('catches every ORPCError and excludes them from the error channel (data-last)', () => {
    const recovered = effect.pipe(catchORPCError((error) => {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'NOT_FOUND', { id: string }> | ORPCError<'CONFLICT', number>>()
      return Effect.succeed('recovered' as const)
    }))

    expectTypeOf(recovered).toEqualTypeOf<Effect.Effect<'output' | 'recovered', TypeError, Service1>>()
  })

  it('catches every ORPCError and excludes them from the error channel (data-first)', () => {
    const recovered = catchORPCError(effect, (error) => {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'NOT_FOUND', { id: string }> | ORPCError<'CONFLICT', number>>()
      return Effect.succeed('recovered' as const)
    })

    expectTypeOf(recovered).toEqualTypeOf<Effect.Effect<'output' | 'recovered', TypeError, Service1>>()
  })

  it('merges handler error and requirement channels into the result', () => {
    const recovered = effect.pipe(
      catchORPCError(() => ({} as Effect.Effect<'recovered', RangeError, Service2>)),
    )

    expectTypeOf(recovered).toEqualTypeOf<Effect.Effect<'output' | 'recovered', RangeError | TypeError, Service1 | Service2>>()
  })

  it('handler receives never when the error channel contains no ORPCError', () => {
    const safe = {} as Effect.Effect<'output', TypeError>

    void safe.pipe(catchORPCError((error) => {
      expectTypeOf(error).toEqualTypeOf<never>()
      return Effect.succeed('recovered' as const)
    }))
  })
})

describe('catchORPCErrorByCode', () => {
  it('catches ORPCErrors with a matching code and excludes them from the error channel (data-last)', () => {
    const recovered = effect.pipe(catchORPCErrorByCode('NOT_FOUND', (error) => {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'NOT_FOUND', { id: string }>>()
      return Effect.succeed('recovered' as const)
    }))

    expectTypeOf(recovered).toEqualTypeOf<Effect.Effect<'output' | 'recovered', ORPCError<'CONFLICT', number> | TypeError, Service1>>()
  })

  it('catches ORPCErrors with a matching code and excludes them from the error channel (data-first)', () => {
    const recovered = catchORPCErrorByCode(effect, 'CONFLICT', (error) => {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'CONFLICT', number>>()
      return Effect.succeed('recovered' as const)
    })

    expectTypeOf(recovered).toEqualTypeOf<Effect.Effect<'output' | 'recovered', ORPCError<'NOT_FOUND', { id: string }> | TypeError, Service1>>()
  })

  it('merges handler error and requirement channels into the result', () => {
    const recovered = effect.pipe(
      catchORPCErrorByCode('NOT_FOUND', () => ({} as Effect.Effect<'recovered', RangeError, Service2>)),
    )

    expectTypeOf(recovered).toEqualTypeOf<
      Effect.Effect<'output' | 'recovered', ORPCError<'CONFLICT', number> | RangeError | TypeError, Service1 | Service2>
    >()
  })

  it('supports custom error codes', () => {
    const custom = {} as Effect.Effect<'output', ORPCError<'__CUSTOM__', undefined> | TypeError>

    const recovered = custom.pipe(catchORPCErrorByCode('__CUSTOM__', (error) => {
      expectTypeOf(error).toEqualTypeOf<ORPCError<'__CUSTOM__', undefined>>()
      return Effect.succeed('recovered' as const)
    }))

    expectTypeOf(recovered).toEqualTypeOf<Effect.Effect<'output' | 'recovered', TypeError, never>>()
  })

  it('suggests and restricts the code to those present in the error channel', () => {
    // @ts-expect-error - BAD_GATEWAY is not present in the error channel (data-last)
    void effect.pipe(catchORPCErrorByCode('BAD_GATEWAY', () => Effect.succeed('recovered')))

    // @ts-expect-error - BAD_GATEWAY is not present in the error channel (data-first)
    void catchORPCErrorByCode(effect, 'BAD_GATEWAY', () => Effect.succeed('recovered'))

    // @ts-expect-error - code must be a string
    void effect.pipe(catchORPCErrorByCode(123, () => Effect.succeed('recovered')))
  })
})
