import type { FetchHandler } from './types'

describe('FetchHandler', () => {
  it('optional second argument when context is not required', () => {
    const handler = {} as FetchHandler<{ auth: boolean } | undefined>

    handler.fetch(new Request('https://example.com'))
    handler.fetch(new Request('https://example.com'), { context: { auth: true } })

    const handler2 = {} as FetchHandler<{ auth: boolean }>

    // @ts-expect-error -- context is required
    handler2.fetch(new Request('https://example.com'))
    handler2.fetch(new Request('https://example.com'), { context: { auth: true } })
  })
})
