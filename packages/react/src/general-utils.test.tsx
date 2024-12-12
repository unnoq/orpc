import type { SchemaOutput } from '@orpc/contract'
import type {
  UserCreateInputSchema,
  UserFindInputSchema,
  UserListInputSchema,
  UserListOutputSchema,
  UserSchema,
} from '../tests/orpc'
import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createGeneralUtils } from './general-utils'

let qc = new QueryClient()

let user_utils = createGeneralUtils({
  queryClient: qc,
  path: ['user'],
})

let user_find_utils = createGeneralUtils<
  typeof UserFindInputSchema,
  typeof UserSchema,
  SchemaOutput<typeof UserSchema>
>({
  queryClient: qc,
  path: ['user', 'find'],
})

let user_list_utils = createGeneralUtils<
  typeof UserListInputSchema,
  typeof UserListOutputSchema,
  SchemaOutput<typeof UserListOutputSchema>
>({
  queryClient: qc,
  path: ['user', 'list'],
})

let user_create_utils = createGeneralUtils<
  typeof UserCreateInputSchema,
  typeof UserSchema,
  SchemaOutput<typeof UserSchema>
>({
  queryClient: qc,
  path: ['user', 'create'],
})

beforeEach(() => {
  qc = new QueryClient()
  user_utils = createGeneralUtils({
    queryClient: qc,
    path: ['user'],
  })

  user_find_utils = createGeneralUtils<
    typeof UserFindInputSchema,
    typeof UserSchema,
    SchemaOutput<typeof UserSchema>
  >({
    queryClient: qc,
    path: ['user', 'find'],
  })

  user_list_utils = createGeneralUtils<
    typeof UserListInputSchema,
    typeof UserListOutputSchema,
    SchemaOutput<typeof UserListOutputSchema>
  >({
    queryClient: qc,
    path: ['user', 'list'],
  })

  user_create_utils = createGeneralUtils<
    typeof UserCreateInputSchema,
    typeof UserSchema,
    SchemaOutput<typeof UserSchema>
  >({
    queryClient: qc,
    path: ['user', 'create'],
  })
})

it('getQueriesData', () => {
  const user = {
    id: '123',
    name: '123-4',
  }

  qc.setQueryData(
    [['user', 'find'], { input: { id: user.id }, type: 'infinite' }],
    'never get this',
  )
  qc.setQueryData(
    [['user', 'find'], { input: { id: user.id }, type: 'query' }],
    user,
  )

  expect(user_utils.getQueriesData().length).toEqual(1)
  expect(user_utils.getQueriesData()[0]?.[1]).toEqual(user)

  expect(user_find_utils.getQueriesData().length).toEqual(1)
  expect(user_find_utils.getQueriesData()[0]?.[1]).toEqual(user)
  expect(
    user_find_utils.getQueriesData({ input: { id: user.id } }).length,
  ).toEqual(1)

  expect(
    user_find_utils.getQueriesData({ input: { id: 'diff' } }).length,
  ).toEqual(0)
  expect(user_list_utils.getQueriesData().length).toEqual(0)
})

it('getInfiniteQueriesData', () => {
  const page = {
    nextCursor: 1,
    users: [],
  }

  qc.setQueryData([['user', 'list'], { type: 'infinite' }], page)
  qc.setQueryData([['user', 'list'], { type: 'query' }], 'never get this')

  expect(user_utils.getInfiniteQueriesData().length).toEqual(1)
  expect(user_utils.getInfiniteQueriesData()[0]?.[1]).toEqual(page)

  expect(user_list_utils.getInfiniteQueriesData().length).toEqual(1)
  expect(user_list_utils.getInfiniteQueriesData()[0]?.[1]).toEqual(page)

  expect(
    user_list_utils.getInfiniteQueriesData({ input: { keyword: 'invalid' } })
      .length,
  ).toEqual(0)
  expect(user_find_utils.getInfiniteQueriesData().length).toEqual(0)
})

it('setQueriesData', () => {
  const page = {
    nextCursor: 1,
    users: [],
  }

  const user = {
    id: '123',
    name: '123-4',
  }

  qc.setQueryData(
    [['user', 'find'], { input: { id: user.id }, type: 'infinite' }],
    page,
  )
  qc.setQueryData(
    [['user', 'find'], { input: { id: user.id }, type: 'query' }],
    user,
  )

  const user2 = {
    ...user,
    id: 'user-2',
  }

  user_utils.setQueriesData({}, (old: any) => {
    expect(old).toBe(user)

    return user2
  })

  const user3 = {
    ...user2,
    id: 'user-2',
  }

  user_find_utils.setQueriesData({}, (old: any) => {
    expect(old).toEqual(user2)

    return user3
  })

  const fn = vi.fn()
  user_list_utils.setQueriesData({}, fn)
  expect(fn).not.toHaveBeenCalled()

  expect(
    qc.getQueryData([
      ['user', 'find'],
      { input: { id: user.id }, type: 'query' },
    ]),
  ).toEqual(user3)
})

it('setInfiniteQueriesData', () => {
  const page = {
    pageParams: [undefined],
    pages: [
      {
        nextCursor: 1,
        users: [],
      },
    ],
  }

  const user = {
    id: '123',
    name: '123-4',
  }

  qc.setQueryData([['user', 'list'], { type: 'infinite' }], page)
  qc.setQueryData([['user', 'list'], { type: 'query' }], user)

  const page2 = {
    ...page,
    page: 2,
  }

  user_utils.setInfiniteQueriesData({}, (old) => {
    expect(old).toBe(page)

    return page2 as any
  })

  const page3 = {
    ...page,
    page: 3,
  }

  user_list_utils.setInfiniteQueriesData({}, (old) => {
    expect(old).toEqual(page2)

    return page3
  })

  const fn = vi.fn()
  user_find_utils.setQueriesData({}, fn)
  expect(fn).not.toHaveBeenCalled()

  expect(qc.getQueryData([['user', 'list'], { type: 'infinite' }])).toEqual(
    page3,
  )
})

describe('invalidate', () => {
  const infiniteQueryKey = [['user', 'list'], { type: 'infinite' }]
  const queryKey = [['user', 'list'], { type: 'query' }]

  const reset = () => {
    qc.setQueryData(infiniteQueryKey, 'page')
    qc.setQueryData(queryKey, 'user')
  }

  beforeEach(() => {
    reset()

    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(false)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(false)
  })

  it('root level', () => {
    user_utils.invalidate()

    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(true)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(true)

    reset()
    user_utils.invalidate({ queryType: 'query' })

    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(false)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(true)
  })

  it('procedure level', () => {
    user_list_utils.invalidate()

    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(true)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(true)
  })

  it('procedure level with filters', () => {
    user_list_utils.invalidate({ queryType: 'query' })
    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(false)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(true)

    reset()

    user_list_utils.invalidate({ queryType: 'infinite' })
    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(true)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(false)
  })

  it('on mismatched procedure level', () => {
    user_find_utils.invalidate()
    expect(qc.getQueryState(infiniteQueryKey)?.isInvalidated).toBe(false)
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(false)
  })
})

describe('refetch', () => {
  const infiniteQueryKey = [['user', 'list'], { type: 'infinite' }]
  const queryKey = [['user', 'list'], { type: 'query' }]

  const fn1 = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
  const fn2 = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

  beforeEach(() => {
    fn1.mockClear()
    fn2.mockClear()

    renderHook(() =>
      useInfiniteQuery(
        {
          queryKey: infiniteQueryKey,
          queryFn: fn1,
          getNextPageParam: () => 2,
          initialPageParam: 1,
        },
        qc,
      ),
    )

    renderHook(() =>
      useQuery(
        {
          queryKey,
          queryFn: fn2,
        },
        qc,
      ),
    )

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  it('root level', async () => {
    user_utils.refetch()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    await new Promise(resolve => setTimeout(resolve, 101))
    user_utils.refetch()

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('root level with filters', async () => {
    user_utils.refetch({ queryType: 'query' })
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    await new Promise(resolve => setTimeout(resolve, 101))
    user_utils.refetch({ queryType: 'query' })

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('procedure level', async () => {
    user_list_utils.refetch()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    await new Promise(resolve => setTimeout(resolve, 101))
    user_list_utils.refetch()

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('procedure level with filters', async () => {
    user_list_utils.refetch({ queryType: 'infinite' })

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    await new Promise(resolve => setTimeout(resolve, 101))
    user_list_utils.refetch({ queryType: 'infinite' })

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  it('on mismatched procedure level', async () => {
    user_find_utils.refetch()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    await new Promise(resolve => setTimeout(resolve, 101))
    user_find_utils.refetch()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })
})

describe('cancel', () => {
  const infiniteQueryKey = [['user', 'list'], { type: 'infinite' }]
  const queryKey = [['user', 'list'], { type: 'query' }]

  beforeEach(() => {
    renderHook(() =>
      useInfiniteQuery(
        {
          queryKey: infiniteQueryKey,
          queryFn: async () =>
            await new Promise(resolve => setTimeout(resolve, 100)),
          getNextPageParam: () => 2,
          initialPageParam: 1,
        },
        qc,
      ),
    )

    renderHook(() =>
      useQuery(
        {
          queryKey,
          queryFn: async () =>
            await new Promise(resolve => setTimeout(resolve, 100)),
        },
        qc,
      ),
    )

    expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('fetching')
    expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('fetching')
  })

  it('root level', () => {
    user_utils.cancel()

    expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('idle')
    expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('idle')
  })

  it('root level with filters', () => {
    user_utils.cancel({ queryType: 'query' })

    expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('fetching')
    expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('idle')
  })

  it('procedure level', () => {
    user_list_utils.cancel()

    expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('idle')
    expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('idle')
  })

  it('procedure level with filters', () => {
    user_list_utils.cancel({ queryType: 'infinite' })

    expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('idle')
    expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('fetching')
  })

  it('on mismatched procedure level', () => {
    user_find_utils.cancel()
    expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('fetching')
    expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('fetching')
  })
})

describe('remove', () => {
  const infiniteQueryKey = [['user', 'list'], { type: 'infinite' }]
  const queryKey = [['user', 'list'], { type: 'query' }]

  beforeEach(() => {
    qc.setQueryData(infiniteQueryKey, 'page')
    qc.setQueryData(queryKey, 'user')

    expect(qc.getQueryState(infiniteQueryKey)).not.toBe(undefined)
    expect(qc.getQueryState(queryKey)).not.toBe(undefined)
  })

  it('root level', () => {
    user_utils.remove()

    expect(qc.getQueryState(infiniteQueryKey)).toBe(undefined)
    expect(qc.getQueryState(queryKey)).toBe(undefined)
  })

  it('root level with filters', () => {
    user_utils.remove({ queryType: 'query' })

    expect(qc.getQueryState(infiniteQueryKey)).not.toBe(undefined)
    expect(qc.getQueryState(queryKey)).toBe(undefined)
  })

  it('procedure level', () => {
    user_list_utils.remove()

    expect(qc.getQueryState(infiniteQueryKey)).toBe(undefined)
    expect(qc.getQueryState(queryKey)).toBe(undefined)
  })

  it('procedure level with filters', () => {
    user_list_utils.remove({ queryType: 'infinite' })

    expect(qc.getQueryState(infiniteQueryKey)).toBe(undefined)
    expect(qc.getQueryState(queryKey)).not.toBe(undefined)
  })

  it('on mismatched procedure level', () => {
    user_find_utils.remove()
    expect(qc.getQueryState(infiniteQueryKey)).not.toBe(undefined)
    expect(qc.getQueryState(queryKey)).not.toBe(undefined)
  })
})

describe('reset', () => {
  const infiniteQueryKey = [['user', 'list'], { type: 'infinite' }]
  const queryKey = [['user', 'list'], { type: 'query' }]

  const fn1 = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
  const fn2 = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))

  beforeEach(() => {
    fn1.mockClear()
    fn2.mockClear()

    renderHook(() =>
      useInfiniteQuery(
        {
          queryKey: infiniteQueryKey,
          queryFn: fn1,
          getNextPageParam: () => 2,
          initialPageParam: 1,
        },
        qc,
      ),
    )

    renderHook(() =>
      useQuery(
        {
          queryKey,
          queryFn: fn2,
        },
        qc,
      ),
    )

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  it('root level', () => {
    user_utils.reset()

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('root level with filters', () => {
    user_utils.reset({ queryType: 'query' })

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('procedure level', () => {
    user_list_utils.reset()

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2)
  })

  it('procedure level with filters', () => {
    user_list_utils.reset({ queryType: 'infinite' })

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  it('on mismatched procedure level', () => {
    user_find_utils.reset()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })
})

it('isFetching', () => {
  const infiniteQueryKey = [['user', 'list'], { type: 'infinite' }]
  const queryKey = [['user', 'list'], { type: 'query' }]

  renderHook(() =>
    useInfiniteQuery(
      {
        queryKey: infiniteQueryKey,
        queryFn: async () =>
          await new Promise(resolve => setTimeout(resolve, 100)),
        getNextPageParam: () => 2,
        initialPageParam: 1,
      },
      qc,
    ),
  )

  renderHook(() =>
    useQuery(
      {
        queryKey,
        queryFn: async () =>
          await new Promise(resolve => setTimeout(resolve, 100)),
      },
      qc,
    ),
  )

  expect(qc.getQueryState(infiniteQueryKey)?.fetchStatus).toBe('fetching')
  expect(qc.getQueryState(queryKey)?.fetchStatus).toBe('fetching')

  expect(user_utils.isFetching()).toBe(2)
  expect(user_utils.isFetching({ queryType: 'infinite' })).toBe(1)
  expect(user_utils.isFetching({ queryType: 'query' })).toBe(1)
  expect(user_list_utils.isFetching()).toBe(2)
  expect(user_list_utils.isFetching({ queryType: 'infinite' })).toBe(1)
  expect(user_list_utils.isFetching({ queryType: 'query' })).toBe(1)
  expect(user_find_utils.isFetching()).toBe(0)
})

it('isMutating', async () => {
  const { result } = renderHook(() =>
    useMutation(
      {
        mutationKey: [['user', 'create']],
        mutationFn: () => new Promise(resolve => setTimeout(resolve, 100)),
      },
      qc,
    ),
  )

  expect(user_utils.isMutating()).toBe(0)

  result.current.mutate()

  expect(user_utils.isMutating()).toBe(1)
  expect(user_create_utils.isMutating()).toBe(1)
  expect(user_list_utils.isMutating()).toBe(0)
  expect(user_find_utils.isMutating()).toBe(0)
})

describe('getQueryDefaults', () => {
  it('on router level', () => {
    const fn = vi.fn()

    qc.setQueryDefaults([['user'], { type: 'query' }], {
      queryFn: fn,
    })

    expect(user_utils.getQueryDefaults()?.queryFn).toBe(fn)
    expect(user_find_utils.getQueryDefaults()?.queryFn).toBe(fn)
    expect(user_list_utils.getQueryDefaults()?.queryFn).toBe(fn)
  })

  it('on procedure level', () => {
    const fn = vi.fn()

    qc.setQueryDefaults([['user', 'list'], { type: 'query' }], {
      queryFn: fn,
    })

    expect(user_utils.getQueryDefaults()?.queryFn).toBe(undefined)
    expect(user_find_utils.getQueryDefaults()?.queryFn).toBe(undefined)
    expect(user_list_utils.getQueryDefaults()?.queryFn).toBe(fn)
  })
})

describe('getInfiniteQueryDefaults', () => {
  it('on router level', () => {
    const fn = vi.fn()

    qc.setQueryDefaults([['user'], { type: 'infinite' }], {
      queryFn: fn,
    })

    expect(user_utils.getInfiniteQueryDefaults()?.queryFn).toBe(fn)
    expect(user_find_utils.getInfiniteQueryDefaults()?.queryFn).toBe(fn)
    expect(user_list_utils.getInfiniteQueryDefaults()?.queryFn).toBe(fn)
  })

  it('on procedure level', () => {
    const fn = vi.fn()

    qc.setQueryDefaults([['user', 'list'], { type: 'infinite' }], {
      queryFn: fn,
    })

    expect(user_utils.getInfiniteQueryDefaults()?.queryFn).toBe(undefined)
    expect(user_find_utils.getInfiniteQueryDefaults()?.queryFn).toBe(undefined)
    expect(user_list_utils.getInfiniteQueryDefaults()?.queryFn).toBe(fn)
  })
})

describe('setQueryDefaults', () => {
  it('on router level', () => {
    const fn = vi.fn()

    user_utils.setQueryDefaults({
      queryFn: fn,
    })

    expect(qc.getQueryDefaults([['user'], { type: 'query' }])?.queryFn).toBe(fn)
    expect(
      qc.getQueryDefaults([['user', 'find'], { type: 'query' }])?.queryFn,
    ).toBe(fn)
    expect(
      qc.getQueryDefaults([['user', 'find'], { type: 'infinite' }])?.queryFn,
    ).toBe(undefined)
  })

  it('on procedure level', () => {
    const fn = vi.fn()

    user_list_utils.setQueryDefaults({
      queryFn: fn,
    })

    expect(qc.getQueryDefaults([['user'], { type: 'query' }])?.queryFn).toBe(
      undefined,
    )
    expect(
      qc.getQueryDefaults([['user', 'list'], { type: 'query' }])?.queryFn,
    ).toBe(fn)
  })
})

describe('setInfiniteQueryDefaults', () => {
  it('on router level', () => {
    const fn = vi.fn()

    user_utils.setInfiniteQueryDefaults({
      queryFn: fn,
    })

    expect(qc.getQueryDefaults([['user'], { type: 'infinite' }])?.queryFn).toBe(
      fn,
    )
    expect(
      qc.getQueryDefaults([['user', 'find'], { type: 'infinite' }])?.queryFn,
    ).toBe(fn)
    expect(
      qc.getQueryDefaults([['user', 'find'], { type: 'query' }])?.queryFn,
    ).toBe(undefined)
  })

  it('on procedure level', () => {
    const fn = vi.fn()

    user_list_utils.setInfiniteQueryDefaults({
      queryFn: fn,
    })

    expect(qc.getQueryDefaults([['user'], { type: 'infinite' }])?.queryFn).toBe(
      undefined,
    )
    expect(
      qc.getQueryDefaults([['user', 'list'], { type: 'infinite' }])?.queryFn,
    ).toBe(fn)
  })
})

describe('getMutationDefaults', () => {
  it('on router level', () => {
    const fn = vi.fn()

    qc.setMutationDefaults([['user']], {
      mutationFn: fn,
    })

    expect(user_utils.getMutationDefaults()?.mutationFn).toBe(fn)
    expect(user_find_utils.getMutationDefaults()?.mutationFn).toBe(fn)
    expect(user_list_utils.getMutationDefaults()?.mutationFn).toBe(fn)
  })

  it('on procedure level', () => {
    const fn = vi.fn()

    qc.setMutationDefaults([['user', 'create']], {
      mutationFn: fn,
    })

    expect(user_utils.getMutationDefaults()?.mutationFn).toBe(undefined)
    expect(user_find_utils.getMutationDefaults()?.mutationFn).toBe(undefined)
    expect(user_create_utils.getMutationDefaults()?.mutationFn).toBe(fn)
  })
})

describe('setMutationDefaults', () => {
  it('on router level', () => {
    const fn = vi.fn()

    user_utils.setMutationDefaults({
      mutationFn: fn,
    })

    expect(qc.getMutationDefaults([['user']])?.mutationFn).toBe(fn)
    expect(qc.getMutationDefaults([['user', 'create']])?.mutationFn).toBe(fn)
    expect(qc.getMutationDefaults([['ping']])?.mutationFn).toBe(undefined)
  })

  it('on procedure level', () => {
    const fn = vi.fn()

    user_create_utils.setMutationDefaults({
      mutationFn: fn,
    })

    expect(qc.getMutationDefaults([['user']])?.mutationFn).toBe(undefined)
    expect(qc.getMutationDefaults([['user', 'create']])?.mutationFn).toBe(fn)
  })
})
