import * as Key from '@orpc/tanstack-query'
import { experimental_streamedQuery, skipToken } from '@tanstack/solid-query'
import { queryClient } from '../tests/shared'
import { createProcedureUtils } from './procedure-utils'

vi.mock('@tanstack/solid-query', async (origin) => {
  const original = await origin() as any

  return {
    ...original,
    experimental_streamedQuery: vi.fn(original.experimental_streamedQuery),
  }
})

const generateOperationKeySpy = vi.spyOn(Key, 'generateOperationKey')

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

describe('createProcedureUtils', () => {
  const controller = new AbortController()
  const signal = controller.signal
  const client = vi.fn().mockResolvedValue('__output__')
  const utils = createProcedureUtils(client, { path: ['ping'] })

  it('.call', () => {
    expect(utils.call).toBe(client)
  })

  describe('.queryOptions', () => {
    it('without skipToken', async () => {
      const options = utils.queryOptions({ input: { search: '__search__' }, context: { batch: '__batch__' } })

      expect('enabled' in options).toBe(false)
      expect(options.enabled).toBe(undefined)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: { search: '__search__' } })

      await expect(options.queryFn!({ signal } as any)).resolves.toEqual('__output__')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, { signal, context: { batch: '__batch__' } })
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

  describe('.streamedOptions', () => {
    it('without skipToken', async () => {
      client.mockImplementationOnce(async function* (input) {
        yield '__1__'
        yield '__2__'
        return '__3__'
      })

      const options = utils.experimental_streamedOptions({
        input: { search: '__search__' },
        context: { batch: '__batch__' },
        queryFnOptions: { refetchMode: 'replace' },
      })

      expect('enabled' in options).toBe(false)
      expect(options.enabled).toBe(undefined)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], {
        type: 'streamed',
        input: { search: '__search__' },
        fnOptions: { refetchMode: 'replace' },
      })

      expect(options.queryFn).toBe(vi.mocked(experimental_streamedQuery).mock.results[0]!.value)
      expect(experimental_streamedQuery).toHaveBeenCalledTimes(1)
      expect(experimental_streamedQuery).toHaveBeenCalledWith({
        refetchMode: 'replace',
        queryFn: expect.any(Function),
      })

      await expect(options.queryFn!({ signal, client: queryClient, queryKey: options.queryKey } as any)).resolves.toEqual(['__1__', '__2__'])
      expect(queryClient.getQueryData(options.queryKey)).toEqual(['__1__', '__2__'])

      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, { signal, context: { batch: '__batch__' } })
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
      client.mockResolvedValueOnce('__1__')
      const options = utils.experimental_streamedOptions({ input: { search: '__search__' }, context: { batch: '__batch__' } })

      await expect(options.queryFn!({ signal, client: queryClient } as any)).rejects.toThrow('streamedQuery requires an event iterator output')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, { signal, context: { batch: '__batch__' } })
    })
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
      expect(options.enabled).toBe(undefined)

      expect(options.queryKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
      expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
      expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'infinite', input: { search: '__search__', pageParam: '__initialPageParam__' } })

      expect(options.initialPageParam).toEqual('__initialPageParam__')
      expect(options.getNextPageParam).toBe(getNextPageParam)

      await expect(options.queryFn!({ signal, pageParam: '__pageParam__' } as any)).resolves.toEqual('__output__')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__', pageParam: '__pageParam__' }, { signal, context: { batch: '__batch__' } })
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

  it('.mutationOptions', async () => {
    const options = utils.mutationOptions({
      context: { batch: '__batch__' },
    })

    expect(options.mutationKey).toBe(generateOperationKeySpy.mock.results[0]!.value)
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['ping'], { type: 'mutation' })

    await expect(options.mutationFn!('__input__', {} as any)).resolves.toEqual('__output__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith('__input__', { context: { batch: '__batch__' } })
  })
})
