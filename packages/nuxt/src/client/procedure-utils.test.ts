import { ref } from 'vue'
import { generateOperationKey } from './key'
import { ProcedureUtils } from './procedure-utils'
import { OPERATION_CONTEXT_SYMBOL } from './types'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('procedureUtils', () => {
  const client = vi.fn()
  const utils = new ProcedureUtils(['ping'], client, {})

  it('.call', () => {
    expect(utils.call).toBe(client)
  })

  it('.key', () => {
    expect(utils.key()).toBe(generateOperationKey(['ping']))
    expect(utils.key({ input: { search: '__search__' } })).toBe(generateOperationKey(['ping'], { input: { search: '__search__' } }))
  })

  it('.key with prefix', () => {
    const prefixedUtils = new ProcedureUtils(['ping'], client, { prefix: '__prefix__' })

    expect(prefixedUtils.key()).toBe(generateOperationKey(['ping'], { prefix: '__prefix__' }))
    expect(prefixedUtils.key({ input: { search: '__search__' } })).toBe(generateOperationKey(['ping'], { prefix: '__prefix__', input: { search: '__search__' } }))
  })

  it('.asyncDataArgs', async () => {
    client.mockResolvedValueOnce('__output__')

    const [key, handler] = utils.asyncDataArgs({ input: { search: '__search__' }, context: { batch: true } })

    expect(key.value).toBe(generateOperationKey(['ping'], { input: { search: '__search__' } }))

    await expect(handler()).resolves.toBe('__output__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toHaveBeenCalledWith({ search: '__search__' }, {
      context: { batch: true, [OPERATION_CONTEXT_SYMBOL]: { key: key.value, type: 'asyncData' } },
    })
  })

  it('.asyncDataArgs without options', async () => {
    client.mockResolvedValueOnce('__output__')

    const [key, handler] = utils.asyncDataArgs()

    expect(key.value).toBe(generateOperationKey(['ping']))

    await expect(handler()).resolves.toBe('__output__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toHaveBeenCalledWith(undefined, {
      context: { [OPERATION_CONTEXT_SYMBOL]: { key: key.value, type: 'asyncData' } },
    })
  })

  it('.asyncDataArgs with reactive input', async () => {
    const input = ref({ search: '__search__' })

    const [key, handler] = utils.asyncDataArgs({ input })

    expect(key.value).toBe(generateOperationKey(['ping'], { input: { search: '__search__' } }))

    input.value = { search: '__updated__' }

    expect(key.value).toBe(generateOperationKey(['ping'], { input: { search: '__updated__' } }))

    client.mockResolvedValueOnce('__output__')
    await expect(handler()).resolves.toBe('__output__')
    expect(client).toHaveBeenCalledWith({ search: '__updated__' }, {
      context: { [OPERATION_CONTEXT_SYMBOL]: { key: key.value, type: 'asyncData' } },
    })
  })

  it('.asyncDataArgs with getter input', () => {
    const search = ref('__search__')

    const [key] = utils.asyncDataArgs({ input: () => ({ search: search.value }) })

    expect(key.value).toBe(generateOperationKey(['ping'], { input: { search: '__search__' } }))

    search.value = '__updated__'

    expect(key.value).toBe(generateOperationKey(['ping'], { input: { search: '__updated__' } }))
  })

  it('.asyncDataArgs with prefix', () => {
    const prefixedUtils = new ProcedureUtils(['ping'], client, { prefix: '__prefix__' })

    const [key] = prefixedUtils.asyncDataArgs({ input: { search: '__search__' } })

    expect(key.value).toBe(generateOperationKey(['ping'], { prefix: '__prefix__', input: { search: '__search__' } }))
  })
})
