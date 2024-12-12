import type { SchemaOutput } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { InfiniteData } from '@tanstack/react-query'
import {
  queryClient,
  type UserCreateInputSchema,
  type UserFindInputSchema,
  type UserListInputSchema,
  type UserListOutputSchema,
  type UserSchema,
} from '../tests/orpc'
import { createGeneralUtils } from './general-utils'

const user_utils = createGeneralUtils({
  queryClient,
  path: ['user'],
})

const user_find_utils = createGeneralUtils<
  typeof UserFindInputSchema,
  typeof UserSchema,
  SchemaOutput<typeof UserSchema>
>({
  queryClient,
  path: ['user', 'find'],
})

const user_list_utils = createGeneralUtils<
  typeof UserListInputSchema,
  typeof UserListOutputSchema,
  SchemaOutput<typeof UserListOutputSchema>
>({
  queryClient,
  path: ['user', 'list'],
})

const user_create_utils = createGeneralUtils<
  typeof UserCreateInputSchema,
  typeof UserSchema,
  SchemaOutput<typeof UserSchema>
>({
  queryClient,
  path: ['user', 'create'],
})

describe('getQueriesData', () => {
  it('simple', () => {
    expectTypeOf(user_utils.getQueriesData()).toMatchTypeOf(
      queryClient.getQueriesData<unknown>({}),
    )

    expectTypeOf(user_find_utils.getQueriesData()).toMatchTypeOf(
      queryClient.getQueriesData<SchemaOutput<typeof UserSchema>>({}),
    )
  })

  it('with filters', () => {
    user_find_utils.getQueriesData({ input: { id: '1' } })
    // @ts-expect-error invalid input
    user_find_utils.getQueriesData({ input: { id: 1 } })
  })
})

describe('getInfiniteQueriesData', () => {
  it('simple', () => {
    expectTypeOf(user_utils.getInfiniteQueriesData()).toMatchTypeOf(
      queryClient.getQueriesData<InfiniteData<unknown>>({}),
    )

    expectTypeOf(user_list_utils.getInfiniteQueriesData()).toMatchTypeOf(
      queryClient.getQueriesData<
        InfiniteData<SchemaOutput<typeof UserListOutputSchema>>
      >({}),
    )
  })

  it('with filters', () => {
    user_list_utils.getQueriesData({ input: { keyword: '1' } })
    // @ts-expect-error invalid input
    user_list_utils.getQueriesData({ input: { keyword: 1 } })
  })
})

describe('setQueriesData', () => {
  it('simple', () => {
    user_utils.setQueriesData({}, (old: unknown) => {
      expectTypeOf(old).toMatchTypeOf<unknown | undefined>()

      return 'can return any value'
    })

    user_find_utils.setQueriesData({}, (old) => {
      expectTypeOf(old).toEqualTypeOf<
        SchemaOutput<typeof UserSchema> | undefined
      >()

      return old
    })
  })

  it('with filters', () => {
    user_find_utils.setQueriesData({ input: { id: '1' } }, undefined, {
      updatedAt: 12344,
    })
    // @ts-expect-error invalid input
    user_find_utils.setQueriesData({ input: { id: 1 } }, undefined)
  })
})

describe('setInfiniteQueriesData', () => {
  it('simple', () => {
    user_utils.setInfiniteQueriesData({}, (old) => {
      expectTypeOf(old).toEqualTypeOf<InfiniteData<unknown, never> | undefined>()

      return {
        pageParams: [],
        pages: [],
      }
    })

    user_list_utils.setInfiniteQueriesData({}, (old) => {
      expectTypeOf(old).toEqualTypeOf<
        | InfiniteData<
          SchemaOutput<typeof UserListOutputSchema>,
            number | undefined
        >
        | undefined
      >()

      return old
    })
  })

  it('with filters', () => {
    user_list_utils.setInfiniteQueriesData(
      { input: { keyword: '1' } },
      undefined,
      {
        updatedAt: 12344,
      },
    )
    // @ts-expect-error invalid input
    user_list_utils.setInfiniteQueriesData({ input: { keyword: 1 } }, undefined)
  })
})

it('invalidate', () => {
  user_utils.invalidate()
  user_utils.invalidate({
    input: 'anything',
  })
  user_utils.invalidate({
    queryType: 'infinite' /** only invalidate infinite */,
  })

  user_find_utils.invalidate({
    input: { id: '12' },
  })
  user_find_utils.invalidate({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const result = user_find_utils.invalidate({}, { throwOnError: true })

  expectTypeOf(result).toEqualTypeOf<Promise<void>>()
})

it('refetch', () => {
  user_utils.refetch()
  user_utils.refetch({
    input: 'anything',
  })
  user_utils.refetch({
    queryType: 'infinite' /** only refetch infinite */,
  })

  user_find_utils.refetch({
    input: { id: '12' },
  })
  user_find_utils.refetch({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const result = user_find_utils.refetch({}, { throwOnError: true })

  expectTypeOf(result).toEqualTypeOf<Promise<void>>()
})

it('cancel', () => {
  user_utils.cancel()
  user_utils.cancel({
    input: 'anything',
  })
  user_utils.cancel({
    queryType: 'infinite' /** only cancel infinite */,
  })

  user_find_utils.cancel({
    input: { id: '12' },
  })
  user_find_utils.cancel({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const result = user_find_utils.cancel({}, { revert: true })

  expectTypeOf(result).toEqualTypeOf<Promise<void>>()
})

it('remove', () => {
  user_utils.remove()
  user_utils.remove({
    input: 'anything',
  })
  user_utils.remove({
    queryType: 'infinite' /** only remove infinite */,
  })

  user_find_utils.remove({
    input: { id: '12' },
  })
  user_find_utils.remove({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const result = user_find_utils.remove({})

  expectTypeOf(result).toEqualTypeOf<void>()
})

it('reset', () => {
  user_utils.reset()
  user_utils.reset({
    input: 'anything',
  })
  user_utils.reset({
    queryType: 'infinite' /** only reset infinite */,
  })

  user_find_utils.reset({
    input: { id: '12' },
  })
  user_find_utils.reset({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const result = user_find_utils.reset({}, { throwOnError: true })

  expectTypeOf(result).toEqualTypeOf<Promise<void>>()
})

it('isFetching', () => {
  user_utils.isFetching()
  user_utils.isFetching({
    input: 'anything',
  })
  user_utils.isFetching({
    queryType: 'infinite' /** only isFetching infinite */,
  })

  user_find_utils.isFetching({
    input: { id: '12' },
  })
  user_find_utils.isFetching({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const result = user_find_utils.isFetching({})

  expectTypeOf(result).toEqualTypeOf<number>()
})

it('isMutating', () => {
  user_utils.isMutating()

  const result = user_find_utils.isMutating({})

  expectTypeOf(result).toEqualTypeOf<number>()
})

it('getQueryDefaults', () => {
  const r1 = user_utils.getQueryDefaults()

  if (typeof r1.queryFn === 'function') {
    expectTypeOf<ReturnType<typeof r1.queryFn>>().toMatchTypeOf<
      Promisable<unknown>
    >()
  }

  user_utils.getQueryDefaults({
    input: 'anything',
  })

  user_find_utils.getQueryDefaults({
    input: { id: '12' },
  })
  user_find_utils.getQueryDefaults({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const r2 = user_find_utils.getQueryDefaults({})

  if (typeof r2.queryFn === 'function') {
    expectTypeOf<ReturnType<typeof r2.queryFn>>().toMatchTypeOf<
      Promisable<SchemaOutput<typeof UserSchema>>
    >()
  }
})

it('getInfiniteQueryDefaults', () => {
  const r1 = user_utils.getInfiniteQueryDefaults()
  if (typeof r1.queryFn === 'function') {
    expectTypeOf<ReturnType<typeof r1.queryFn>>().toMatchTypeOf<
      Promisable<unknown>
    >()
  }

  user_utils.getInfiniteQueryDefaults({
    input: {},
  })

  user_find_utils.getInfiniteQueryDefaults({
    input: { id: '12' },
  })
  user_find_utils.getInfiniteQueryDefaults({
    // @ts-expect-error invalid input
    input: { id: 12 },
  })

  const r2 = user_find_utils.getInfiniteQueryDefaults({})

  if (typeof r2.queryFn === 'function') {
    expectTypeOf<ReturnType<typeof r2.queryFn>>().toMatchTypeOf<
      Promisable<SchemaOutput<typeof UserSchema>>
    >()
  }
})

it('setQueryDefaults', () => {
  user_utils.setQueryDefaults({
    queryFn() {
      return 'anything'
    },
    enabled(query) {
      expectTypeOf(query.state.data).toEqualTypeOf<unknown>()

      return true
    },
  })

  user_utils.setQueryDefaults(
    {},
    {
      input: 'anything',
    },
  )

  user_find_utils.setQueryDefaults(
    {},
    {
      input: { id: '12' },
    },
  )
  user_find_utils.setQueryDefaults(
    {},
    {
      // @ts-expect-error invalid input
      input: { id: 12 },
    },
  )

  user_find_utils.setQueryDefaults({
    queryFn() {
      return { id: '1233', name: 'name' }
    },
    enabled(query) {
      expectTypeOf(query.state.data).toEqualTypeOf<
        SchemaOutput<typeof UserSchema> | undefined
      >()

      return true
    },
  })

  user_find_utils.setQueryDefaults({
    // @ts-expect-error invalid
    queryFn() {
      return 'invalid'
    },
  })
})

it('setInfiniteQueryDefaults', () => {
  user_utils.setInfiniteQueryDefaults({
    queryFn() {
      return 'anything'
    },
    enabled(query) {
      expectTypeOf(query.state.data).toEqualTypeOf<
        InfiniteData<unknown> | undefined
      >()

      return true
    },
  })

  user_utils.setInfiniteQueryDefaults(
    {},
    {
      input: 'anything',
    },
  )

  user_find_utils.setInfiniteQueryDefaults(
    {},
    {
      input: { id: '12' },
    },
  )
  user_find_utils.setInfiniteQueryDefaults(
    {},
    {
      // @ts-expect-error invalid input
      input: { id: 12 },
    },
  )

  user_find_utils.setInfiniteQueryDefaults({
    queryFn() {
      return { id: '1233', name: 'name' }
    },
    enabled(query) {
      expectTypeOf(query.state.data).toEqualTypeOf<
        InfiniteData<SchemaOutput<typeof UserSchema>> | undefined
      >()

      return true
    },
  })

  user_find_utils.setInfiniteQueryDefaults({
    // @ts-expect-error invalid
    queryFn() {
      return 'invalid'
    },
  })
})
