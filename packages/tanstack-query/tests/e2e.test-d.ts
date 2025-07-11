import type { InfiniteData } from '@tanstack/react-query'
import { isDefinedError } from '@orpc/client'
import { useInfiniteQuery, useMutation, useQueries, useQuery, useSuspenseInfiniteQuery, useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { orpc as client } from '../../client/tests/shared'
import { orpc, queryClient, streamedOrpc } from './shared'

it('.key', () => {
  queryClient.invalidateQueries({
    queryKey: orpc.nested.key({ type: 'query' }),
  })

  orpc.ping.key({})
  orpc.ping.key({ input: { input: 123 } })
  // @ts-expect-error --- input is invalid
  orpc.ping.key({ input: { input: 'INVALID' } })
})

it('.call', () => {
  expectTypeOf(orpc.ping.call).toEqualTypeOf(client.ping)
})

it('.queryKey', () => {
  const state = queryClient.getQueryState(orpc.ping.queryKey({ input: { input: 123 } }))

  expectTypeOf(state?.data).toEqualTypeOf<{ output: string } | undefined>()

  if (isDefinedError(state?.error) && state.error.code === 'BASE') {
    expectTypeOf(state.error.data).toEqualTypeOf<{ output: string }>()
  }
})

describe('.queryOptions', () => {
  it('useQuery', () => {
    const query = useQuery(orpc.ping.queryOptions({
      input: { input: 123 },
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status === 'error' && isDefinedError(query.error) && query.error.code === 'OVERRIDE') {
      expectTypeOf(query.error.data).toEqualTypeOf<unknown>()
    }

    if (query.status === 'success') {
      expectTypeOf(query.data).toEqualTypeOf<{ output: string }>()
    }

    useQuery(orpc.ping.queryOptions({
      // @ts-expect-error --- input is invalid
      input: {
        input: '123',
      },
    }))

    useQuery(orpc.ping.queryOptions({
      input: { input: 123 },
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
    }))
  })

  it('useSuspenseQuery', () => {
    const query = useSuspenseQuery(orpc.ping.queryOptions({
      input: { input: 123 },
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status === 'error' && isDefinedError(query.error) && query.error.code === 'OVERRIDE') {
      expectTypeOf(query.error.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(query.data).toEqualTypeOf<{ output: string }>()

    useSuspenseQuery(orpc.ping.queryOptions({
      // @ts-expect-error --- input is invalid
      input: {
        input: '123',
      },
    }))

    useSuspenseQuery(orpc.ping.queryOptions({
      input: { input: 123 },
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
    }))
  })

  it('useQueries', async () => {
    const queries = useQueries({
      queries: [
        orpc.ping.queryOptions({
          input: { input: 123 },
          select: data => ({ mapped: data }),
          retry(failureCount, error) {
            if (isDefinedError(error) && error.code === 'BASE') {
              expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
            }

            return false
          },
        }),
        orpc.nested.pong.queryOptions({
          context: { cache: '123' },
        }),
      ],
    })

    if (queries[0].status === 'error' && isDefinedError(queries[0].error) && queries[0].error.code === 'BASE') {
      expectTypeOf(queries[0].error.data).toEqualTypeOf<{ output: string }>()
    }

    if (queries[0].status === 'success') {
      expectTypeOf(queries[0].data.mapped).toEqualTypeOf<{ output: string }>()
    }

    if (queries[1].status === 'error') {
      expectTypeOf(queries[1].error).toEqualTypeOf<Error>()
    }

    if (queries[1].status === 'success') {
      expectTypeOf(queries[1].data).toEqualTypeOf<unknown>()
    }
  })

  it('useSuspenseQueries', async () => {
    const queries = useSuspenseQueries({
      queries: [
        orpc.ping.queryOptions({
          input: { input: 123 },
          select: data => ({ mapped: data }),
          retry(failureCount, error) {
            if (isDefinedError(error) && error.code === 'BASE') {
              expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
            }

            return false
          },
        }),
        orpc.nested.pong.queryOptions({
          context: { cache: '123' },
        }),
      ],
    })

    if (queries[0].status === 'error' && isDefinedError(queries[0].error) && queries[0].error.code === 'BASE') {
      expectTypeOf(queries[0].error.data).toEqualTypeOf<{ output: string }>()
    }

    expectTypeOf(queries[0].data.mapped).toEqualTypeOf<{ output: string }>()

    if (queries[1].status === 'error') {
      expectTypeOf(queries[1].error).toEqualTypeOf<Error>()
    }

    expectTypeOf(queries[1].data).toEqualTypeOf<unknown>()
  })

  it('fetchQuery', async () => {
    const query = await queryClient.fetchQuery(orpc.ping.queryOptions({
      input: { input: 123 },
    }))

    expectTypeOf(query).toEqualTypeOf<{ output: string }>()
  })
})

it('.streamedKey', () => {
  const state = queryClient.getQueryState(streamedOrpc.streamed.experimental_streamedKey({ input: { input: 123 } }))

  expectTypeOf(state?.data).toEqualTypeOf<{ output: string }[] | undefined>()

  if (isDefinedError(state?.error) && state.error.code === 'OVERRIDE') {
    expectTypeOf(state.error.data).toEqualTypeOf<unknown>()
  }
})

describe('.streamedOptions', () => {
  it('useQuery', () => {
    const query = useQuery(streamedOrpc.streamed.experimental_streamedOptions({
      input: { input: 123 },
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status === 'error' && isDefinedError(query.error) && query.error.code === 'OVERRIDE') {
      expectTypeOf(query.error.data).toEqualTypeOf<unknown>()
    }

    if (query.status === 'success') {
      expectTypeOf(query.data).toEqualTypeOf<{ output: string }[]>()
    }

    useQuery(orpc.ping.experimental_streamedOptions({
      // @ts-expect-error --- input is invalid
      input: {
        input: '123',
      },
    }))

    useQuery(orpc.ping.experimental_streamedOptions({
      input: { input: 123 },
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
    }))
  })

  it('useSuspenseQuery', () => {
    const query = useSuspenseQuery(streamedOrpc.streamed.experimental_streamedOptions({
      input: { input: 123 },
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status === 'error' && isDefinedError(query.error) && query.error.code === 'OVERRIDE') {
      expectTypeOf(query.error.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(query.data).toEqualTypeOf<{ output: string }[]>()

    useSuspenseQuery(streamedOrpc.streamed.experimental_streamedOptions({
      // @ts-expect-error --- input is invalid
      input: {
        input: '123',
      },
    }))

    useSuspenseQuery(streamedOrpc.streamed.experimental_streamedOptions({
      input: { input: 123 },
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
    }))
  })

  it('useQueries', async () => {
    const queries = useQueries({
      queries: [
        streamedOrpc.streamed.experimental_streamedOptions({
          input: { input: 123 },
          select: data => ({ mapped: data }),
          retry(failureCount, error) {
            if (isDefinedError(error) && error.code === 'BASE') {
              expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
            }

            return false
          },
        }),
        orpc.nested.pong.queryOptions({
          context: { cache: '123' },
        }),
      ],
    })

    if (queries[0].status === 'error' && isDefinedError(queries[0].error) && queries[0].error.code === 'BASE') {
      expectTypeOf(queries[0].error.data).toEqualTypeOf<{ output: string }>()
    }

    if (queries[0].status === 'success') {
      expectTypeOf(queries[0].data.mapped).toEqualTypeOf<{ output: string }[]>()
    }

    if (queries[1].status === 'error') {
      expectTypeOf(queries[1].error).toEqualTypeOf<Error>()
    }

    if (queries[1].status === 'success') {
      expectTypeOf(queries[1].data).toEqualTypeOf<unknown>()
    }
  })

  it('useSuspenseQueries', async () => {
    const queries = useSuspenseQueries({
      queries: [
        streamedOrpc.streamed.experimental_streamedOptions({
          input: { input: 123 },
          select: data => ({ mapped: data }),
          retry(failureCount, error) {
            if (isDefinedError(error) && error.code === 'BASE') {
              expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
            }

            return false
          },
        }),
        orpc.nested.pong.queryOptions({
          context: { cache: '123' },
        }),
      ],
    })

    if (queries[0].status === 'error' && isDefinedError(queries[0].error) && queries[0].error.code === 'OVERRIDE') {
      expectTypeOf(queries[0].error.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(queries[0].data.mapped).toEqualTypeOf<{ output: string }[]>()

    if (queries[1].status === 'error') {
      expectTypeOf(queries[1].error).toEqualTypeOf<Error>()
    }

    expectTypeOf(queries[1].data).toEqualTypeOf<unknown>()
  })

  it('fetchQuery', async () => {
    const query = await queryClient.fetchQuery(streamedOrpc.streamed.experimental_streamedOptions({
      input: { input: 123 },
    }))

    expectTypeOf(query).toEqualTypeOf<{ output: string }[]>()
  })
})

it('.infiniteKey', () => {
  const state = queryClient.getQueryState(orpc.nested.ping.infiniteKey({ input: input => ({ input }), initialPageParam: 1 }))

  expectTypeOf(state?.data).toEqualTypeOf<InfiniteData<{ output: string }, number> | undefined>()

  if (isDefinedError(state?.error) && state.error.code === 'OVERRIDE') {
    expectTypeOf(state.error.data).toEqualTypeOf<unknown>()
  }
})

describe('.infiniteOptions', () => {
  it('useInfiniteQuery', () => {
    const query = useInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => ({ input: pagePram }),
      getNextPageParam: () => 2,
      initialPageParam: 2,
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status === 'error' && isDefinedError(query.error) && query.error.code === 'OVERRIDE') {
      expectTypeOf(query.error.data).toEqualTypeOf<unknown>()
    }

    if (query.status === 'success') {
      expectTypeOf(query.data.pages[0]!).toEqualTypeOf<{ output: string }>()
    }

    // @ts-expect-error --- input is invalid
    useInfiniteQuery(orpc.nested.ping.infiniteOptions({
      // @ts-expect-error --- input is invalid
      input: pagePram => ({
        input: pagePram,
      }),
      getNextPageParam: () => '2',
      initialPageParam: '2',
    }))

    // @ts-expect-error --- cache is invalid
    useInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => ({ input: pagePram }),
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
      getNextPageParam: () => 2,
      initialPageParam: 1,
    }))
  })

  it('useSuspenseInfiniteQuery', () => {
    const query = useSuspenseInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => ({ input: pagePram }),
      getNextPageParam: () => 2,
      initialPageParam: 2,
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status === 'error' && isDefinedError(query.error) && query.error.code === 'OVERRIDE') {
      expectTypeOf(query.error.data).toEqualTypeOf<unknown>()
    }

    if (query.status === 'success') {
      expectTypeOf(query.data.pages[0]!).toEqualTypeOf<{ output: string }>()
    }

    // @ts-expect-error --- input is invalid
    useSuspenseInfiniteQuery(orpc.nested.ping.infiniteOptions({
      // @ts-expect-error --- input is invalid
      input: pagePram => ({
        input: pagePram,
      }),
      getNextPageParam: () => '2',
      initialPageParam: '2',
    }))

    // @ts-expect-error --- cache is invalid
    useSuspenseInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => ({ input: pagePram }),
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
      getNextPageParam: () => 2,
      initialPageParam: 1,
    }))
  })

  it('fetchInfiniteQuery', async () => {
    const query = await queryClient.fetchInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => ({ input: pagePram }),
      getNextPageParam: () => 2,
      initialPageParam: 2,
    }))

    expectTypeOf(query).toEqualTypeOf<InfiniteData<{ output: string }, number>>()
  })
})

describe('.mutationOptions', () => {
  it('useMutation', async () => {
    const mutation = useMutation(orpc.ping.mutationOptions({
      onMutate(variables) {
        expectTypeOf(variables).toEqualTypeOf<{ input: number }>()
        return { customContext: true }
      },
      onError(error, variables, context) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        expectTypeOf(context?.customContext).toEqualTypeOf<boolean | undefined>()
        expectTypeOf(variables).toEqualTypeOf<{ input: number }>()
      },
    }))

    if (mutation.status === 'error' && isDefinedError(mutation.error) && mutation.error.code === 'OVERRIDE') {
      expectTypeOf(mutation.error.data).toEqualTypeOf<unknown>()
    }

    if (mutation.status === 'success') {
      expectTypeOf(mutation.data).toEqualTypeOf<{ output: string }>()
    }

    mutation.mutate({ input: 123 })

    mutation.mutateAsync({
    // @ts-expect-error --- input is invalid
      input: 'INVALID',
    })

    useMutation(orpc.ping.mutationOptions({
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
    }))
  })
})
