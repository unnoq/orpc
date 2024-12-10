import { useInfiniteQuery, useMutation, useQuery, useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { orpc, queryClient } from './helpers'

beforeEach(() => {
  queryClient.clear()
})

describe('useQuery', () => {
  it('works - onSuccess', async () => {
    const { result } = renderHook(() => useQuery(orpc.ping.queryOptions(), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(result.current.data).toEqual('pong'))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual('pong')
  })

  it('works - onError', async () => {
    // @ts-expect-error -- invalid input
    const { result } = renderHook(() => useQuery(orpc.user.create.queryOptions({ input: {} }), queryClient))

    await vi.waitFor(() => expect(result.current.error).toEqual(new Error('Validation input failed')))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual(undefined)
  })
})

describe('useInfiniteQuery', () => {
  it('works - onSuccess', async () => {
    const { result } = renderHook(() => useInfiniteQuery(orpc.user.list.infiniteOptions({
      input: {},
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient))

    await vi.waitFor(() => expect(result.current.data?.pages.length).toEqual(1))

    result.current.fetchNextPage()

    await vi.waitFor(() => expect(result.current.data?.pages.length).toEqual(2))
  })
})

describe('useMutation', () => {
  it('works - onSuccess', async () => {
    const { result } = renderHook(() => useMutation(orpc.ping.mutationOptions(), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    result.current.mutate({})

    expect(queryClient.isMutating({ mutationKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(1)

    await vi.waitFor(() => expect(result.current.data).toEqual('pong'))
  })
})

describe('useSuspenseQuery', () => {
  it('works - onSuccess', async () => {
    const { result } = renderHook(() => useSuspenseQuery(orpc.ping.queryOptions(), queryClient))

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(result.current.data).toEqual('pong'))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual('pong')
  })
})

describe('useSuspenseInfiniteQuery', () => {
  it('works - onSuccess', async () => {
    const { result } = renderHook(() => useSuspenseInfiniteQuery(orpc.user.list.infiniteOptions({
      input: {},
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient))

    await vi.waitFor(() => expect(result.current.data?.pages.length).toEqual(1))

    result.current.fetchNextPage()

    await vi.waitFor(() => expect(result.current.data?.pages.length).toEqual(2))
  })
})
