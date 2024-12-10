import { createGeneralUtils } from './utils-general'

describe('key', () => {
  const utils = createGeneralUtils<{ a: { b: { c: number } } }>([])

  it('infer correct input type & partial input', () => {
    utils.key()
    utils.key({})
    utils.key({ type: 'infinite' })
    utils.key({ input: {}, type: 'query' })
    utils.key({ input: {} })
    utils.key({ input: { a: {} } })
    utils.key({ input: { a: { b: {} } } })
    utils.key({ input: { a: { b: { c: 1 } } } })

    // @ts-expect-error invalid input
    utils.key({ input: 123 })
    // @ts-expect-error invalid input
    utils.key({ input: { a: { b: { c: '1' } } } })

    // @ts-expect-error invalid input
    utils.key({ type: 'ddd' })
  })

  it('it prevent pass input when type is mutation', () => {
    utils.key({ type: 'mutation' })
    // @ts-expect-error input is not allowed when type is mutation
    utils.key({ input: {}, type: 'mutation' })
  })
})
