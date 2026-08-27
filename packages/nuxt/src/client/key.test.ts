import { generateOperationKey, generateStructuredOperationKey, parseOperationKey } from './key'

describe('generateStructuredOperationKey', () => {
  it('without prefix', () => {
    expect(generateStructuredOperationKey(['ping'])).toEqual([['ping'], {}])
    expect(generateStructuredOperationKey(['ping'], { input: { search: '__search__' } })).toEqual([['ping'], { input: { search: '__search__' } }])
  })

  it('with prefix', () => {
    expect(generateStructuredOperationKey(['ping'], { prefix: '__prefix__' })).toEqual(['__prefix__', ['ping'], {}])
    expect(generateStructuredOperationKey(['ping'], { prefix: '__prefix__', input: { search: '__search__' } })).toEqual(['__prefix__', ['ping'], { input: { search: '__search__' } }])
  })

  it('serializes non-JSON input values', () => {
    expect(generateStructuredOperationKey(['ping'], { input: { date: new Date('2020-01-01T00:00:00.000Z') } })).toEqual([['ping'], { input: { date: '2020-01-01T00:00:00.000Z' } }])
  })
})

describe('generateOperationKey', () => {
  it('serializes to a string', () => {
    expect(generateOperationKey(['ping'])).toBe(JSON.stringify([['ping'], {}]))
    expect(generateOperationKey(['nested', 'ping'], { prefix: '__prefix__', input: { search: '__search__' } })).toBe(
      JSON.stringify(['__prefix__', ['nested', 'ping'], { input: { search: '__search__' } }]),
    )
  })

  it('generates the same key regardless of input property order', () => {
    expect(generateOperationKey(['ping'], { input: { a: 1, b: { c: 2, d: 3 } } })).toBe(
      generateOperationKey(['ping'], { input: { b: { d: 3, c: 2 }, a: 1 } as any }),
    )
  })
})

describe('parseOperationKey', () => {
  it('round-trips generated keys', () => {
    expect(parseOperationKey(generateOperationKey(['ping']))).toEqual([['ping'], {}])
    expect(parseOperationKey(generateOperationKey(['ping'], { prefix: '__prefix__', input: { search: '__search__' } }))).toEqual(
      ['__prefix__', ['ping'], { input: { search: '__search__' } }],
    )
  })

  it('returns undefined for foreign keys', () => {
    expect(parseOperationKey('not-json')).toBeUndefined()
    expect(parseOperationKey('"a string"')).toBeUndefined()
    expect(parseOperationKey('[]')).toBeUndefined()
    expect(parseOperationKey('[1,2,3,4]')).toBeUndefined()
    expect(parseOperationKey(JSON.stringify([['ping']]))).toBeUndefined()
    expect(parseOperationKey(JSON.stringify([['ping'], 'not-an-object']))).toBeUndefined()
    expect(parseOperationKey(JSON.stringify([[1], {}]))).toBeUndefined()
    expect(parseOperationKey(JSON.stringify([1, ['ping'], {}]))).toBeUndefined()
  })
})
