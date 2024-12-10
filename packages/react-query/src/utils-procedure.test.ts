import * as keyModule from './key'
import { createProcedureUtils } from './utils-procedure'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

beforeEach(() => {
  buildKeySpy.mockClear()
})

describe('queryOptions', () => {
  const client = vi.fn((input: number | undefined) => Promise.resolve(input?.toString()))
  const utils = createProcedureUtils(client, ['ping'])

  it('works', async () => {
    const options = utils.queryOptions({ input: 1 })

    expect(options.queryKey).toEqual(['__ORPC__', ['ping'], { type: 'query', input: 1 }])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: 1 })

    client.mockResolvedValueOnce('__mocked__')
    await expect((options as any).queryFn()).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith(1)
  })
})

describe('infiniteOptions', () => {
  const getNextPageParam = vi.fn()

  it('works ', async () => {
    const client = vi.fn<(input: { limit?: number, cursor: number | undefined }) => Promise<string>>()
    const utils = createProcedureUtils(client, [])

    const options = utils.infiniteOptions({
      input: { limit: 5 },
      getNextPageParam,
      initialPageParam: 1,
    })

    expect(options.initialPageParam).toEqual(1)
    expect(options.queryKey).toEqual(['__ORPC__', [], { type: 'infinite', input: { limit: 5 } }])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith([], { type: 'infinite', input: { limit: 5 } })

    client.mockResolvedValueOnce('__mocked__')
    await expect((options as any).queryFn({ pageParam: 1 })).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith({ limit: 5, cursor: 1 })
  })

  it('works without initialPageParam', async () => {
    const client = vi.fn<(input: { limit?: number, cursor: number | undefined }) => Promise<string>>()
    const utils = createProcedureUtils(client, [])

    const options = utils.infiniteOptions({
      input: { limit: 5 },
      getNextPageParam,
    })

    expect(options.queryKey).toEqual(['__ORPC__', [], { type: 'infinite', input: { limit: 5 } }])
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith([], { type: 'infinite', input: { limit: 5 } })

    client.mockResolvedValueOnce('__mocked__')
    await expect((options as any).queryFn({ pageParam: undefined })).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith({ limit: 5, cursor: undefined })
  })
})
