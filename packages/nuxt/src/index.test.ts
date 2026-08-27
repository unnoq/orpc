import { addImports, addServerImports } from '@nuxt/kit'
import module from './index'

vi.mock('@nuxt/kit', () => ({
  addImports: vi.fn(),
  addServerImports: vi.fn(),
  defineNuxtModule: vi.fn(definition => definition),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('module', () => {
  const definition = module as any

  it('defines meta', () => {
    expect(definition.meta).toEqual({
      name: '@orpc/nuxt',
      configKey: 'orpc',
      compatibility: {
        nuxt: '>=3.15.0',
      },
    })
  })

  it('registers auto-imports on setup', () => {
    definition.setup({}, {} as any)

    expect(addImports).toHaveBeenCalledTimes(1)
    expect(addImports).toHaveBeenCalledWith([
      { name: 'createNuxtUtils', as: 'createNuxtUtils', from: '@orpc/nuxt/client' },
    ])

    expect(addServerImports).toHaveBeenCalledTimes(1)
    expect(addServerImports).toHaveBeenCalledWith([
      { name: 'defineORPCEventHandler', as: 'defineORPCEventHandler', from: '@orpc/nuxt/h3' },
    ])
  })
})
