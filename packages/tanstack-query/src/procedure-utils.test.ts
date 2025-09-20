import { QueryClient, skipToken, experimental_streamedQuery as streamedQuery } from '@tanstack/query-core'
import * as KeyModule from './key'
import * as LiveQuery from './live-query'
import { createProcedureUtils } from './procedure-utils'
import { OPERATION_CONTEXT_SYMBOL } from './types'

vi.mock('@tanstack/query-core', async (origin) => {
  const original = await origin() as any

  return {
    ...original,
    experimental_streamedQuery: vi.fn(original.experimental_streamedQuery),
  }
})

const liveQuerySpy = vi.spyOn(LiveQuery, 'experimental_liveQuery')

const generateOperationKeySpy = vi.spyOn(KeyModule, 'generateOperationKey')

const queryClient = new QueryClient()

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

describe('createProcedureUtils', () => {
  const signal = new AbortController().signal
  const client = vi.fn()
  const utils = createProcedureUtils(client, { path: ['ping'] })

  it('.call', () => {
    expect(utils.call).toBe(client)
  })

  it('.queryKey', () => {
    expect(utils.queryKey({ input: { search: '__search__' } })).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: { search: '__search__' } })

    expect(utils.queryKey({ queryKey: ['1'] })).toEqual(['1'])
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
  })

  describe('.queryOptions', () => {
    it('without skipToken', async () => {
      const options = utils.queryOptions({ input: { search: '__search__' }, context: { batch: '__batch__' } })

      expect('enabled' in options).toBe(false)
      expect(options.enabled).toBeUndefined()

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: { search: '__search__' } })

      client.mockResolvedValueOnce('__output__')
      await expect(options.queryFn!({ signal } as any)).resolves.toEqual('__output__')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, { signal, context: {
        batch: '__batch__',
        [OPERATION_CONTEXT_SYMBOL]: {
          key: options.queryKey,
          type: 'query',
        },
      } })
    })

    it('with skipToken', async () => {
      const options = utils.queryOptions({ input: skipToken, context: { batch: '__batch__' } })

      expect(options.enabled).toBe(false)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: skipToken })

      expect(() => options.queryFn!({ signal } as any)).toThrow('queryFn should not be called with skipToken used as input')
      expect(client).toHaveBeenCalledTimes(0)
    })
  })

  it('.streamedKey', () => {
    expect(utils.experimental_streamedKey({ input: { search: '__search__' } })).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'streamed', input: { search: '__search__' } })

    expect(utils.experimental_streamedKey({ queryKey: ['1'] })).toEqual(['1'])
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
  })

  describe('.streamedOptions', () => {
    it('without skipToken', async () => {
      const options = utils.experimental_streamedOptions({
        input: { search: '__search__' },
        context: { batch: '__batch__' },
        queryFnOptions: {
          refetchMode: 'replace',
        },
      })

      expect('enabled' in options).toBe(false)
      expect(options.enabled).toBeUndefined()

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], {
        type: 'streamed',
        input: { search: '__search__' },
        fnOptions: {
          refetchMode: 'replace',
        },
      })

      expect(options.queryFn).toBe(vi.mocked(streamedQuery).mock.results[0]!.value)
      expect(streamedQuery).toHaveBeenCalledTimes(1)
      expect(streamedQuery).toHaveBeenCalledWith({
        refetchMode: 'replace',
        streamFn: expect.any(Function),
      })

      client.mockImplementationOnce(async function* (input) {
        yield '__1__'
        yield '__2__'
        return '__3__'
      })
      await expect(options.queryFn!({ signal, client: queryClient, queryKey: options.queryKey } as any)).resolves.toEqual(['__1__', '__2__'])
      expect(queryClient.getQueryData(options.queryKey)).toEqual(['__1__', '__2__'])

      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, {
        signal,
        context: {
          batch: '__batch__',
          [OPERATION_CONTEXT_SYMBOL]: {
            key: options.queryKey,
            type: 'streamed',
          },
        },
      })
    })

    it('with skipToken', async () => {
      const options = utils.experimental_streamedOptions({ input: skipToken, context: { batch: '__batch__' } })

      expect(options.enabled).toBe(false)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'streamed', input: skipToken })

      await expect(options.queryFn!({ signal, client: queryClient } as any)).rejects.toThrow('queryFn should not be called with skipToken used as input')
      expect(client).toHaveBeenCalledTimes(0)
    })

    it('with unsupported output', async () => {
      const options = utils.experimental_streamedOptions({ input: { search: '__search__' }, context: { batch: '__batch__' } })

      client.mockResolvedValueOnce('INVALID')
      await expect(options.queryFn!({ signal, client: queryClient } as any)).rejects.toThrow('streamedQuery requires an event iterator output')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, { signal, context: {
        batch: '__batch__',
        [OPERATION_CONTEXT_SYMBOL]: {
          key: options.queryKey,
          type: 'streamed',
        },
      } })
    })
  })

  it('.liveKey', () => {
    expect(utils.experimental_liveKey({ input: { search: '__search__' } })).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'live', input: { search: '__search__' } })

    expect(utils.experimental_liveKey({ queryKey: ['1'] })).toEqual(['1'])
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
  })

  describe('.liveOptions', () => {
    it('without skipToken', async () => {
      const options = utils.experimental_liveOptions({
        input: { search: '__search__' },
        context: { batch: '__batch__' },
      })

      expect('enabled' in options).toBe(false)
      expect(options.enabled).toBeUndefined()

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], {
        type: 'live',
        input: { search: '__search__' },
      })

      expect(options.queryFn).toBe(vi.mocked(liveQuerySpy).mock.results[0]!.value)
      expect(liveQuerySpy).toHaveBeenCalledTimes(1)
      expect(liveQuerySpy).toHaveBeenCalledWith(expect.any(Function))

      client.mockImplementationOnce(async function* (input) {
        yield '__1__'
        yield '__2__'
        return '__3__'
      })
      await expect(options.queryFn!({ signal, client: queryClient, queryKey: options.queryKey } as any)).resolves.toEqual('__2__')
      expect(queryClient.getQueryData(options.queryKey)).toEqual('__2__')

      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, {
        signal,
        context: {
          batch: '__batch__',
          [OPERATION_CONTEXT_SYMBOL]: {
            key: options.queryKey,
            type: 'live',
          },
        },
      })
    })

    it('with skipToken', async () => {
      const options = utils.experimental_liveOptions({ input: skipToken, context: { batch: '__batch__' } })

      expect(options.enabled).toBe(false)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'live', input: skipToken })

      await expect(options.queryFn!({ signal, client: queryClient } as any)).rejects.toThrow('queryFn should not be called with skipToken used as input')
      expect(client).toHaveBeenCalledTimes(0)
    })

    it('with unsupported output', async () => {
      const options = utils.experimental_liveOptions({ input: { search: '__search__' }, context: { batch: '__batch__' } })

      client.mockResolvedValueOnce('INVALID')
      await expect(options.queryFn!({ signal, client: queryClient } as any)).rejects.toThrow('liveQuery requires an event iterator output')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, {
        signal,
        context: {
          batch: '__batch__',
          [OPERATION_CONTEXT_SYMBOL]: {
            key: options.queryKey,
            type: 'live',
          },
        },
      })
    })
  })

  it('.infiniteKey', () => {
    expect(utils.infiniteKey({ input: pageParam => ({ search: '__search__', pageParam }), initialPageParam: '__initialPageParam__' })).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'infinite', input: { search: '__search__', pageParam: '__initialPageParam__' } })

    expect(utils.infiniteKey({ input: () => ({}), initialPageParam: 0, queryKey: ['1'] })).toEqual(['1'])
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
  })

  describe('.infiniteOptions', () => {
    it('without skipToken', async () => {
      const getNextPageParam = vi.fn()

      const options = utils.infiniteOptions({
        input: pageParam => ({ search: '__search__', pageParam }),
        context: { batch: '__batch__' },
        getNextPageParam,
        initialPageParam: '__initialPageParam__',
      })

      expect('enabled' in options).toBe(false)
      expect(options.enabled).toBeUndefined()

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'infinite', input: { search: '__search__', pageParam: '__initialPageParam__' } })

      expect(options.initialPageParam).toEqual('__initialPageParam__')
      expect(options.getNextPageParam).toBe(getNextPageParam)

      client.mockResolvedValueOnce('__output__')
      await expect(options.queryFn!({ signal, pageParam: '__pageParam__' } as any)).resolves.toEqual('__output__')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith(
        { search: '__search__', pageParam: '__pageParam__' },
        {
          signal,
          context: {
            batch: '__batch__',
            [OPERATION_CONTEXT_SYMBOL]: {
              key: options.queryKey,
              type: 'infinite',
            },
          },
        },
      )
    })

    it('with skipToken', async () => {
      const getNextPageParam = vi.fn()

      const options = utils.infiniteOptions({
        input: skipToken,
        context: { batch: '__batch__' },
        getNextPageParam,
        initialPageParam: '__initialPageParam__',
      })

      expect(options.enabled).toBe(false)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'infinite', input: skipToken })

      expect(options.initialPageParam).toEqual('__initialPageParam__')
      expect(options.getNextPageParam).toBe(getNextPageParam)

      expect(() => options.queryFn!({ signal, pageParam: '__pageParam__' } as any)).toThrow('queryFn should not be called with skipToken used as input')
      expect(client).toHaveBeenCalledTimes(0)
    })
  })

  it('.mutationKey', () => {
    expect(utils.mutationKey()).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'mutation' })

    expect(utils.mutationKey({ mutationKey: ['1'] })).toEqual(['1'])
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
  })

  it('.mutationOptions', async () => {
    const options = utils.mutationOptions({
      context: { batch: '__batch__' },
    })

    expect(options.mutationKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'mutation' })

    client.mockResolvedValueOnce('__output__')
    await expect(options.mutationFn!('__input__', {} as any)).resolves.toEqual('__output__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith('__input__', { context: {
      batch: '__batch__',
      [OPERATION_CONTEXT_SYMBOL]: {
        key: options.mutationKey,
        type: 'mutation',
      },
    } })
  })
})
