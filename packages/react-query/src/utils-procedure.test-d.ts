import type { InfiniteData } from '@tanstack/react-query'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createProcedureUtils } from './utils-procedure'

describe('queryOptions', () => {
  const client = vi.fn((input: number | undefined) => Promise.resolve(input?.toString()))
  const utils = createProcedureUtils(client, [])

  const client2 = vi.fn((input: number) => Promise.resolve(input.toString()))
  const utils2 = createProcedureUtils(client2, [])

  it('infer correct input type', () => {
    utils.queryOptions({ input: 1 })
    utils.queryOptions({ input: undefined })

    // @ts-expect-error invalid input
    utils.queryOptions({ input: '1' })
  })

  it('can be called without argument', () => {
    utils.queryOptions()
    // @ts-expect-error invalid is required
    utils2.queryOptions()
  })

  it('infer correct output type', () => {
    const query = useQuery(utils2.queryOptions({ input: 1 }))

    if (query.status === 'success') {
      expectTypeOf(query.data).toEqualTypeOf<string>()
    }
  })

  it('work with select options', () => {
    const query = useQuery(utils2.queryOptions({
      input: 1,
      select(data) {
        expectTypeOf(data).toEqualTypeOf<string>()

        return 'new' as const
      },
    }))

    if (query.status === 'success') {
      expectTypeOf(query.data).toEqualTypeOf<'new'>()
    }
  })
})

describe('infiniteOptions', () => {
  const getNextPageParam = vi.fn()

  it('cannot use on procedure without input object-able', () => {
    const utils = createProcedureUtils({} as (input: number) => Promise<string>, [])

    // @ts-expect-error missing initialPageParam
    utils.infiniteOptions({
      input: 123,
      getNextPageParam,
    })

    utils.infiniteOptions({
      input: 123,
      getNextPageParam,
      // @ts-expect-error initialPageParam must be never
      initialPageParam: 123,
    })

    utils.infiniteOptions({
      input: 123,
      getNextPageParam,
      initialPageParam: 123 as never,
    })
  })

  it('infer correct input type', () => {
    const utils = createProcedureUtils({} as (input: { limit?: number, cursor: number }) => Promise<string>, [])

    utils.infiniteOptions({
      input: {
        limit: 1,
      },
      getNextPageParam,
      initialPageParam: 1,
    })
    utils.infiniteOptions({
      input: {
        limit: undefined,
      },
      getNextPageParam,
      initialPageParam: 1,

    })

    utils.infiniteOptions({
      input: {
        // @ts-expect-error invalid input
        limit: 'string',
        // cursor will be ignored
        cursor: {},
      },
      getNextPageParam,
      initialPageParam: 1,
    })
  })

  it('infer correct initialPageParam type', () => {
    const utils = createProcedureUtils({} as (input: { limit?: number, cursor: number }) => Promise<string>, [])

    utils.infiniteOptions({
      input: {},
      getNextPageParam,
      initialPageParam: 1,
    })

    utils.infiniteOptions({
      input: {},
      getNextPageParam,
      // @ts-expect-error initialPageParam must be number
      initialPageParam: '234',
    })

    // @ts-expect-error initialPageParam is required
    utils.infiniteOptions({
      input: {},
      getNextPageParam,
    })
  })

  it('initialPageParam can be optional', () => {
    const utils = createProcedureUtils({} as (input: { limit?: number, cursor?: number }) => Promise<string>, [])

    utils.infiniteOptions({
      input: {},
      getNextPageParam,
    })

    const utils2 = createProcedureUtils({} as (input: { limit?: number, cursor: number }) => Promise<string>, [])

    // @ts-expect-error initialPageParam is required
    utils2.infiniteOptions({
      input: {},
      getNextPageParam,
    })
  })

  it('input can be optional', () => {
    const utils = createProcedureUtils({} as (input: { limit?: number, cursor?: number } | undefined) => Promise<string>, [])

    utils.infiniteOptions({
      getNextPageParam,
    })

    const utils2 = createProcedureUtils({} as (input: { limit?: number, cursor?: number }) => Promise<string>, [])

    // @ts-expect-error input is required
    utils2.infiniteOptions({
      getNextPageParam,
    })
  })

  it('infer correct output type', () => {
    const utils = createProcedureUtils({} as (input: { limit?: number, cursor: number }) => Promise<string>, [])
    const query = useInfiniteQuery(utils.infiniteOptions({
      input: {
        limit: 1,
      },
      getNextPageParam: () => 1,
      initialPageParam: 1,
    }))

    if (query.status === 'success') {
      expectTypeOf(query.data).toEqualTypeOf<InfiniteData<string, unknown>>()
    }
  })

  it('work with select options', () => {
    const utils = createProcedureUtils({} as (input: { limit?: number, cursor: number }) => Promise<string>, [])
    const query = useInfiniteQuery(utils.infiniteOptions({
      input: {
        limit: 1,
      },
      getNextPageParam,
      initialPageParam: 1,
      select(data) {
        expectTypeOf(data).toEqualTypeOf<InfiniteData<string, number>>()

        return 'new' as const
      },
    }))

    if (query.status === 'success') {
      expectTypeOf(query.data).toEqualTypeOf<'new'>()
    }
  })
})

describe('mutationOptions', () => {
  const client = vi.fn((input: number) => Promise.resolve(input.toString()))
  const utils = createProcedureUtils(client, [])

  it('infer correct input type', () => {
    const option = utils.mutationOptions({
      onSuccess: (data, input) => {
        expectTypeOf(input).toEqualTypeOf<number>()
      },
    })

    option.mutationFn!(1)

    // @ts-expect-error invalid input
    option.mutationFn!('1')
    // @ts-expect-error invalid input
    option.mutationFn!()
  })

  it('infer correct output type', () => {
    const option = utils.mutationOptions({
      onSuccess: (data, input) => {
        expectTypeOf(input).toEqualTypeOf<number>()
        expectTypeOf(data).toEqualTypeOf<string>()
      },
    })

    expectTypeOf(option.mutationFn!(1)).toEqualTypeOf <Promise<string>>()
  })

  it('can be called without argument', () => {
    const option = utils.mutationOptions()

    expectTypeOf(option.mutationFn!(1)).toEqualTypeOf <Promise<string>>()
  })
})
