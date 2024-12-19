import { useInfiniteQuery, useMutation, useQueries, useQuery } from '@tanstack/vue-query'
import { ref } from 'vue'
import { orpc, queryClient } from './helpers'

beforeEach(() => {
  queryClient.clear()
})

describe('useQuery', () => {
  it('works - onSuccess', async () => {
    const query = useQuery(orpc.ping.queryOptions(), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    await vi.waitFor(() => expect(query.data.value).toEqual('pong'))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual('pong')
  })

  it('works - with ref', async () => {
    const id = ref('id-1')

    const query = useQuery(orpc.user.find.queryOptions({
      input: ref({ id }),
    }), queryClient)

    await vi.waitFor(() => expect(query.data.value).toEqual({ id: 'id-1', name: 'name-id-1' }))

    id.value = 'id-2'

    await vi.waitFor(() => expect(query.data.value).toEqual({ id: 'id-2', name: 'name-id-2' }))
  })

  it('works - onError', async () => {
    // @ts-expect-error -- invalid input
    const query = useQuery(orpc.user.create.queryOptions({ input: {} }), queryClient)

    await vi.waitFor(() => expect(query.error.value).toEqual(new Error('Input validation failed')))

    expect(queryClient.getQueryData(orpc.ping.key({ type: 'query' }))).toEqual(undefined)
  })
})

describe('useInfiniteQuery', () => {
  it('works - onSuccess', async () => {
    const query = useInfiniteQuery(orpc.user.list.infiniteOptions({
      input: {},
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient)

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(1))

    query.fetchNextPage()

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(2))
  })

  it('works - with ref', async () => {
    const keyword = ref('keyword-1')

    const query = useInfiniteQuery(orpc.user.list.infiniteOptions({
      input: { keyword },
      getNextPageParam: lastPage => lastPage.nextCursor,
    }), queryClient)

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(1))
    expect(query.data.value?.pages[0]!.users[0]?.name).toEqual('number-keyword-1')

    query.fetchNextPage()

    await vi.waitFor(() => expect(query.data.value?.pages.length).toEqual(2))
    expect(query.data.value?.pages[1]!.users[0]?.name).toEqual('number-keyword-1')

    keyword.value = 'keyword-2'

    await vi.waitFor(() => expect(query.data.value?.pages[0]!.users[0]?.name).toEqual('number-keyword-2'))
  })
})

describe('useMutation', () => {
  it('works - onSuccess', async () => {
    const query = useMutation(orpc.ping.mutationOptions(), queryClient)

    expect(queryClient.isFetching({ queryKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(0)

    query.mutate({})

    expect(queryClient.isMutating({ mutationKey: orpc.ping.key() })).toEqual(1)
    expect(queryClient.isMutating({ mutationKey: orpc.ping.key({ type: 'mutation' }) })).toEqual(1)

    await vi.waitFor(() => expect(query.data.value).toEqual('pong'))
  })
})

describe('useQueries', () => {
  it('works - onSuccess', async () => {
    const query = useQueries({
      queries: [
        orpc.user.find.queryOptions({
          input: { id: '0' },
        }),
        orpc.user.list.queryOptions({
          input: {},
        }),
      ],
    }, queryClient)

    await vi.waitFor(() => expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(2))
    await vi.waitFor(() => expect(query.value[0].status).toEqual('success'))
    await vi.waitFor(() => expect(query.value[1].status).toEqual('success'))

    expect(query.value[0].data).toEqual({ id: '0', name: 'name-0' })
    expect(query.value[1].data).toEqual({
      users: [
        { id: 'id-0', name: 'number-undefined' },
      ],
      nextCursor: 2,
    })
  })

  it('support ref', async () => {
    const id = ref('id-1')
    const queries = useQueries({
      queries: [
        orpc.user.find.queryOptions({ input: { id } }),
      ],
    }, queryClient)

    await vi.waitFor(() => expect(queries.value[0].data).toEqual({ id: 'id-1', name: 'name-id-1' }))

    id.value = 'id-2'

    await vi.waitFor(() => expect(queries.value[0].data).toEqual({ id: 'id-2', name: 'name-id-2' }))
  })
})
