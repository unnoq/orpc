import type { Procedure } from '../procedure'
import type { CallerOptions, WELL_CONTEXT } from '../types'
import { lazy } from '../lazy'
import { handleFetchRequest } from './handle-request'

describe('handleFetchRequest', () => {
  const ping = {} as Procedure<{ auth: boolean }, { db: string }, undefined, undefined, undefined>
  const pong = {} as Procedure<WELL_CONTEXT, { db: string }, undefined, undefined, undefined>

  const router = {
    ping: lazy(() => Promise.resolve({ default: ping })),
    pong,
    nested: lazy(() => Promise.resolve({ default: {
      ping,
      pong: lazy(() => Promise.resolve({ default: pong })),
    } })),
  }

  it('infer correct context', () => {
    handleFetchRequest({
      request: {} as Request,
      router,
      handlers: [vi.fn()],
      context: { auth: true },
    })

    handleFetchRequest({
      request: {} as Request,
      router,
      handlers: [vi.fn()],
      context: () => ({ auth: true }),
    })

    handleFetchRequest({
      request: {} as Request,
      router,
      handlers: [vi.fn()],
      context: async () => ({ auth: true }),
    })

    handleFetchRequest({
      request: {} as Request,
      router,
      handlers: [vi.fn()],
      // @ts-expect-error --- invalid context
      context: { auth: 123 },
    })

    // @ts-expect-error --- missing context
    handleFetchRequest({
      request: {} as Request,
      router,
      handlers: [vi.fn()],
    })
  })

  it('hooks', () => {
    handleFetchRequest({
      request: {} as Request,
      router,
      handlers: [vi.fn()],
      context: { auth: true },
      onSuccess: ({ output, input }, context, meta) => {
        expectTypeOf(output).toEqualTypeOf<Response>()
        expectTypeOf(input).toEqualTypeOf<Request>()
        expectTypeOf(context).toEqualTypeOf<{ auth: boolean }>()
        expectTypeOf(meta).toEqualTypeOf<CallerOptions>()
      },
    })
  })
})
