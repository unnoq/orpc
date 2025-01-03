import { useMutation, useQuery } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import {
  ORPCContext,
  queryClient,
  wrapper,
} from '../tests/orpc'
import { createGeneralHooks } from './general-hooks'

beforeEach(() => {
  queryClient.clear()
})

describe('useIsFetching', () => {
  const user_hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user'],
  })

  const user_find_Hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user', 'find'],
  })

  const user_create_Hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user', 'create'],
  })

  it('on success', async () => {
    const { result } = renderHook(() => user_hooks.useIsFetching(), { wrapper })
    const { result: result2 } = renderHook(
      () => user_find_Hooks.useIsFetching(),
      { wrapper },
    )
    const { result: result3 } = renderHook(
      () => user_find_Hooks.useIsFetching({ input: { id: '12333' } }),
      { wrapper },
    )
    const { result: result4 } = renderHook(
      () => user_find_Hooks.useIsFetching({ input: { id: 'never' } }),
      { wrapper },
    )
    const { result: result5 } = renderHook(
      () => user_create_Hooks.useIsFetching(),
      { wrapper },
    )

    expect(result.current).toBe(0)
    expect(result2.current).toBe(0)
    expect(result3.current).toBe(0)
    expect(result4.current).toBe(0)
    expect(result5.current).toBe(0)

    renderHook(() =>
      useQuery(
        {
          queryKey: [
            ['user', 'find'],
            { input: { id: '12333' }, type: 'query' },
          ],
          queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          },
        },
        queryClient,
      ),
    )
    renderHook(() =>
      useQuery(
        {
          queryKey: [
            ['user', 'find'],
            { input: { id: '12333' }, type: 'infinite' },
          ],
          queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          },
        },
        queryClient,
      ),
    )

    await new Promise(resolve => setTimeout(resolve, 50)) // < 100 make sure the query is not finished

    expect(result.current).toBe(2)
    expect(result2.current).toBe(2)
    expect(result3.current).toBe(2)
    expect(result4.current).toBe(0)
    expect(result5.current).toBe(0)
  })
})

describe('useIsMutating', () => {
  const user_hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user'],
  })

  const user_find_Hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user', 'find'],
  })

  const user_create_Hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user', 'create'],
  })

  it('on success', async () => {
    const { result } = renderHook(() => user_hooks.useIsMutating(), { wrapper })
    const { result: result2 } = renderHook(
      () => user_find_Hooks.useIsMutating(),
      { wrapper },
    )
    const { result: result3 } = renderHook(
      () => user_create_Hooks.useIsMutating(),
      { wrapper },
    )

    expect(result.current).toBe(0)
    expect(result2.current).toBe(0)
    expect(result3.current).toBe(0)

    const { result: mutation } = renderHook(() =>
      useMutation(
        {
          mutationKey: [['user', 'create']],
          mutationFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          },
        },
        queryClient,
      ),
    )

    mutation.current.mutate()

    await new Promise(resolve => setTimeout(resolve, 50)) // < 100 make sure the query is not finished

    expect(result.current).toBe(1)
    expect(result2.current).toBe(0)
    expect(result3.current).toBe(1)
  })
})

describe('useMutationState', () => {
  const user_hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user'],
  })

  const user_find_Hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user', 'find'],
  })

  const user_create_Hooks = createGeneralHooks({
    context: ORPCContext,
    path: ['user', 'create'],
  })

  it('on success', async () => {
    const { result } = renderHook(() => user_hooks.useMutationState(), {
      wrapper,
    })
    const { result: result2 } = renderHook(
      () => user_find_Hooks.useMutationState(),
      { wrapper },
    )
    const { result: result3 } = renderHook(
      () => user_create_Hooks.useMutationState(),
      { wrapper },
    )

    expect(result.current.length).toBe(0)
    expect(result2.current.length).toBe(0)
    expect(result3.current.length).toBe(0)

    const { result: mutation } = renderHook(() =>
      useMutation(
        {
          mutationKey: [['user', 'create']],
          mutationFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          },
        },
        queryClient,
      ),
    )

    mutation.current.mutate({ name: 'unnoq' } as any)

    await new Promise(resolve => setTimeout(resolve, 50)) // < 100 make sure the query is not finished

    expect(result.current.length).toBe(1)
    expect(result2.current.length).toBe(0)
    expect(result3.current.length).toBe(1)

    expect(result.current[0]).toEqual(result3.current[0])

    expect(result.current[0]?.variables).toEqual({ name: 'unnoq' })
  })
})
