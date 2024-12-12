import type { SchemaOutput } from '@orpc/contract'
import type { UserFindInputSchema, UserListInputSchema, UserListOutputSchema, UserSchema } from '../tests/orpc'
import { orpcClient, queryClient } from '../tests/orpc'
import { createProcedureUtils } from './procedure-utils'

beforeEach(() => {
  queryClient.clear()
})

describe('fetchQuery', () => {
  const utils = createProcedureUtils<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
    queryClient,
  })

  it('on success', async () => {
    const data = await utils.fetchQuery({ id: '123455' })

    expect(data.id).toEqual('123455')

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [
          ['user', 'find'],
          { input: { id: '123455' }, type: 'query' },
        ],
      })[0]?.[1],
    ).toBe(data)
  })

  it('on error', () => {
    // @ts-expect-error invalid input
    expect(utils.fetchQuery({ id: {} })).rejects.toThrowError(
      'Validation input failed',
    )
  })
})

describe('fetchInfiniteQuery', () => {
  const utils = createProcedureUtils<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
    client: orpcClient.user.list,
    path: ['user', 'list'],
    queryClient,
  })

  it('on success', async () => {
    const data = await utils.fetchInfiniteQuery({ input: {} })

    expect(data).toMatchObject({
      pageParams: [undefined],
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
      ],
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'list'], { input: {}, type: 'infinite' }],
      })[0]?.[1],
    ).toBe(data)
  })

  it('on error', () => {
    expect(
      // @ts-expect-error invalid input
      utils.fetchInfiniteQuery({ input: { keyword: {} } }),
    ).rejects.toThrowError('Validation input failed')
  })
})

describe('prefetchQuery', () => {
  const utils = createProcedureUtils<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
    queryClient,
  })

  it('on success', async () => {
    const result = await utils.prefetchQuery({ id: '123455' })
    expect(result).toEqual(undefined)

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [
          ['user', 'find'],
          { input: { id: '123455' }, type: 'query' },
        ],
      })[0]?.[1],
    ).toEqual({
      id: '123455',
      name: 'name-123455',
    })
  })

  it('on error', () => {
    expect(
      // @ts-expect-error invalid input
      utils.prefetchQuery({ id: 1244 }),
    ).resolves.toEqual(undefined)
  })
})

describe('prefetchInfiniteQuery', () => {
  const utils = createProcedureUtils<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
    client: orpcClient.user.list,
    path: ['user', 'list'],
    queryClient,
  })

  it('on success', async () => {
    const result = await utils.prefetchInfiniteQuery({ input: {} })
    expect(result).toEqual(undefined)

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'list'], { input: {}, type: 'infinite' }],
      })[0]?.[1],
    ).toMatchObject({
      pageParams: [undefined],
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
      ],
    })
  })

  it('on error', () => {
    expect(
      // @ts-expect-error invalid input
      utils.prefetchInfiniteQuery({ keyword: 1222 }, {}),
    ).resolves.toEqual(undefined)
  })
})

describe('ensureQueryData', () => {
  const utils = createProcedureUtils<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
    queryClient,
  })

  it('on success', async () => {
    const data = await utils.ensureQueryData({ id: '123455' })

    expect(data.id).toEqual('123455')

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [
          ['user', 'find'],
          { input: { id: '123455' }, type: 'query' },
        ],
      })[0]?.[1],
    ).toBe(data)
  })

  it('on error', () => {
    // @ts-expect-error invalid input
    expect(utils.ensureQueryData({ id: {} })).rejects.toThrowError(
      'Validation input failed',
    )
  })
})

describe('ensureInfiniteQuery', () => {
  const utils = createProcedureUtils<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
    client: orpcClient.user.list,
    path: ['user', 'list'],
    queryClient,
  })

  it('on success', async () => {
    const data = await utils.ensureInfiniteQueryData({ input: {} })

    expect(data).toMatchObject({
      pageParams: [undefined],
      pages: [
        {
          nextCursor: 2,
          users: [{ name: 'number-0' }, { name: 'number-1' }],
        },
      ],
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'list'], { input: {}, type: 'infinite' }],
      })[0]?.[1],
    ).toBe(data)
  })

  it('on error', () => {
    expect(
      // @ts-expect-error invalid input
      utils.ensureInfiniteQueryData({ input: { keyword: {} } }),
    ).rejects.toThrowError('Validation input failed')
  })
})

describe('getQueryData', () => {
  const utils = createProcedureUtils<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
    queryClient,
  })

  it('on success', async () => {
    expect(utils.getQueryData({ id: '123455' })).toEqual(undefined)
    const data = await utils.ensureQueryData({ id: '123455' })
    expect(utils.getQueryData({ id: '123455' })).toBe(data)
  })
})

describe('getInfiniteQueryData', () => {
  const utils = createProcedureUtils<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
    client: orpcClient.user.list,
    path: ['user', 'list'],
    queryClient,
  })

  it('on success', async () => {
    expect(utils.getInfiniteQueryData({})).toEqual(undefined)
    const data = await utils.ensureInfiniteQueryData({ input: {} })
    expect(utils.getInfiniteQueryData({})).toBe(data)
  })
})

describe('getQueryState', () => {
  const utils = createProcedureUtils<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
    queryClient,
  })

  it('on success', async () => {
    expect(utils.getQueryState({ id: '123455' })).toEqual(undefined)
    const data = await utils.ensureQueryData({ id: '123455' })
    expect(utils.getQueryState({ id: '123455' })).toMatchObject({
      status: 'success',
      data,
    })
  })
})

describe('getInfiniteQueryState', () => {
  const utils = createProcedureUtils<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
    client: orpcClient.user.list,
    path: ['user', 'list'],
    queryClient,
  })

  it('on success', async () => {
    expect(utils.getInfiniteQueryState({})).toEqual(undefined)
    const data = await utils.ensureInfiniteQueryData({ input: {} })
    expect(utils.getInfiniteQueryState({})).toMatchObject({
      status: 'success',
      data,
    })
  })
})

describe('setQueryData', () => {
  const utils = createProcedureUtils<typeof UserFindInputSchema, typeof UserSchema, SchemaOutput<typeof UserSchema>>({
    client: orpcClient.user.find,
    path: ['user', 'find'],
    queryClient,
  })

  it('on success', async () => {
    const original = await utils.ensureQueryData({ id: '1222' })

    const user = {
      id: '1222',
      name: 'name-1222-fake-fake',
    }

    utils.setQueryData({ id: user.id }, (data) => {
      expect(data).toBe(original)

      return user
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'find'], { input: { id: user.id }, type: 'query' }],
      })[0]?.[1],
    ).toEqual(user)
  })
})

describe('getInfiniteQueryData 2', () => {
  const utils = createProcedureUtils<typeof UserListInputSchema, typeof UserListOutputSchema, SchemaOutput<typeof UserListOutputSchema>>({
    client: orpcClient.user.list,
    path: ['user', 'list'],
    queryClient,
  })

  it('on success', async () => {
    const original = await utils.ensureInfiniteQueryData({ input: {} })

    const data = {
      pages: [],
      pageParams: [],
    }

    utils.setInfiniteQueryData({}, (ori) => {
      expect(ori).toBe(original)

      return data
    })

    expect(
      queryClient.getQueriesData({
        exact: true,
        queryKey: [['user', 'list'], { input: {}, type: 'infinite' }],
      })[0]?.[1],
    ).toEqual(data)
  })
})
