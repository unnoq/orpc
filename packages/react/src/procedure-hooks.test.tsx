import type { SchemaOutput } from '@orpc/contract'
import { renderHook, screen, waitFor } from '@testing-library/react'
import {
  ORPCContext,
  queryClient,
  type UserCreateInputSchema,
  type UserFindInputSchema,
  type UserListInputSchema,
  type UserListOutputSchema,
  type UserSchema,
  wrapper,
} from '../tests/orpc'
import { createProcedureHooks } from './procedure-hooks'

beforeEach(() => {
  queryClient.clear()
})

describe('useQuery', () => {
  const hooks = createProcedureHooks<
    typeof UserFindInputSchema,
    typeof UserSchema,
    SchemaOutput<typeof UserSchema>
  >({
    context: ORPCContext,
    path: ['user', 'find'],
  })

  it('on success', async () => {
    const { result } = renderHook(() => hooks.useQuery({ id: '1' }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(result.current.data).toEqual({
      id: '1',
      name: 'name-1',
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'find'], { input: { id: '1' }, type: 'query' }],
      })[0]?.[1],
    ).toBe(result.current.data)
  })

  it('on error', async () => {
    // @ts-expect-error invalid input
    const { result } = renderHook(() => hooks.useQuery({ id: {} }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect((result.current.error as any).message).toEqual(
      'Input validation failed',
    )
  })
})

describe('useInfiniteQuery', () => {
  const hooks = createProcedureHooks<
    typeof UserListInputSchema,
    typeof UserListOutputSchema,
    SchemaOutput<typeof UserListOutputSchema>
  >({
    context: ORPCContext,
    path: ['user', 'list'],
  })

  it('on success', async () => {
    const { result } = renderHook(
      () =>
        hooks.useInfiniteQuery({
          input: { keyword: '1' },
          getNextPageParam(lastPage) {
            return lastPage.nextCursor
          },
        }),
      {
        wrapper,
      },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(result.current.data).toMatchObject({
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
      ],
      pageParams: [undefined],
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [
          ['user', 'list'],
          { input: { keyword: '1' }, type: 'infinite' },
        ],
      })[0]?.[1],
    ).toBe(result.current.data)

    result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2))

    expect(result.current.data).toMatchObject({
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
        {
          nextCursor: 4,
          users: [{ name: 'number-2' }, { name: 'number-3' }],
        },
      ],
      pageParams: [undefined, 2],
    })
  })

  it('on error', async () => {
    const { result } = renderHook(
      () =>
        hooks.useInfiniteQuery({
          // @ts-expect-error invalid input
          input: { keyword: {} },
          getNextPageParam(lastPage) {
            return lastPage.nextCursor
          },
        }),
      {
        wrapper,
      },
    )

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect((result.current.error as any).message).toEqual(
      'Input validation failed',
    )
  })
})

describe('useSuspenseQuery', () => {
  const hooks = createProcedureHooks<
    typeof UserFindInputSchema,
    typeof UserSchema,
    SchemaOutput<typeof UserSchema>
  >({
    context: ORPCContext,
    path: ['user', 'find'],
  })

  it('on success', async () => {
    const { result } = renderHook(() => hooks.useSuspenseQuery({ id: '1' }), {
      wrapper,
    })

    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(result.current.data).toEqual({
      id: '1',
      name: 'name-1',
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'find'], { input: { id: '1' }, type: 'query' }],
      })[0]?.[1],
    ).toBe(result.current.data)
  })

  it('on error', async () => {
    // @ts-expect-error invalid input
    const { result } = renderHook(() => hooks.useSuspenseQuery({ id: {} }), {
      wrapper,
    })

    await waitFor(() =>
      expect(screen.getByTestId('error-boundary')).toHaveTextContent(
        'Input validation failed',
      ),
    )
  })
})

describe('useSuspenseInfiniteQuery', () => {
  const hooks = createProcedureHooks<
    typeof UserListInputSchema,
    typeof UserListOutputSchema,
    SchemaOutput<typeof UserListOutputSchema>
  >({
    context: ORPCContext,
    path: ['user', 'list'],
  })

  it('on success', async () => {
    const { result } = renderHook(
      () =>
        hooks.useSuspenseInfiniteQuery({
          input: { keyword: '1' },
          getNextPageParam(lastPage) {
            return lastPage.nextCursor
          },
        }),
      {
        wrapper,
      },
    )

    await waitFor(() => expect(result.current.status).toBe('success'))

    expect(result.current.data).toMatchObject({
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
      ],
      pageParams: [undefined],
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [
          ['user', 'list'],
          { input: { keyword: '1' }, type: 'infinite' },
        ],
      })[0]?.[1],
    ).toBe(result.current.data)

    result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2))

    expect(result.current.data).toMatchObject({
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
        {
          nextCursor: 4,
          users: [{ name: 'number-2' }, { name: 'number-3' }],
        },
      ],
      pageParams: [undefined, 2],
    })
  })

  it('on error', async () => {
    const { result } = renderHook(
      () =>
        hooks.useSuspenseInfiniteQuery({
          // @ts-expect-error invalid input
          input: { keyword: {} },
          getNextPageParam(lastPage) {
            return lastPage.nextCursor
          },
        }),
      {
        wrapper,
      },
    )

    await waitFor(() =>
      expect(screen.getByTestId('error-boundary')).toHaveTextContent(
        'Input validation failed',
      ),
    )
  })
})

describe('usePrefetchQuery', () => {
  const hooks = createProcedureHooks<
    typeof UserFindInputSchema,
    typeof UserSchema,
    SchemaOutput<typeof UserSchema>
  >({
    context: ORPCContext,
    path: ['user', 'find'],
  })

  it('on success', async () => {
    renderHook(() => hooks.usePrefetchQuery({ id: '1' }), {
      wrapper,
    })

    await waitFor(() =>
      expect(
        queryClient.getQueriesData({
          exact: true,
          queryKey: [['user', 'find'], { input: { id: '1' }, type: 'query' }],
        })[0]?.[1],
      ).toEqual({
        id: '1',
        name: 'name-1',
      }),
    )
  })
})

describe('usePrefetchInfiniteQuery', () => {
  const hooks = createProcedureHooks<
    typeof UserListInputSchema,
    typeof UserListOutputSchema,
    SchemaOutput<typeof UserListOutputSchema>
  >({
    context: ORPCContext,
    path: ['user', 'list'],
  })

  it('on success', async () => {
    renderHook(
      () => hooks.usePrefetchInfiniteQuery({ input: { keyword: '1' } }),
      {
        wrapper,
      },
    )

    await waitFor(() =>
      expect(
        queryClient.getQueriesData({
          exact: true,
          queryKey: [
            ['user', 'list'],
            { input: { keyword: '1' }, type: 'infinite' },
          ],
        })[0]?.[1],
      ).toMatchObject({
        pages: [
          {
            nextCursor: 2,
            users: [{ name: 'number-0' }, { name: 'number-1' }],
          },
        ],
        pageParams: [undefined],
      }),
    )
  })
})

describe('useMutation', () => {
  const hooks = createProcedureHooks<
    typeof UserCreateInputSchema,
    typeof UserSchema,
    SchemaOutput<typeof UserSchema>
  >({
    context: ORPCContext,
    path: ['user', 'create'],
  })

  it('on success', async () => {
    const { result } = renderHook(() => hooks.useMutation(), {
      wrapper,
    })

    result.current.mutate({ name: 'name-1' })

    await waitFor(() =>
      expect(result.current.data).toMatchObject({ name: 'name-1' }),
    )
  })

  it('on error', async () => {
    const { result } = renderHook(() => hooks.useMutation(), {
      wrapper,
    })

    // @ts-expect-error invalid input
    result.current.mutate({ name: {} })

    await waitFor(() =>
      expect((result.current.error as any)?.message).toEqual(
        'Input validation failed',
      ),
    )
  })
})
