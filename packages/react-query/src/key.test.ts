import { buildKey } from './key'

describe('buildKey', () => {
  it('works', () => {
    expect(buildKey(['path'])).toEqual(['__ORPC__', ['path'], {}])
    expect(buildKey(['path'], { type: 'query' })).toEqual(['__ORPC__', ['path'], { type: 'query' }])

    expect(buildKey(['path'], { type: 'query', input: { a: 1 } }))
      .toEqual(['__ORPC__', ['path'], { type: 'query', input: { a: 1 } }])

    expect(buildKey(['path'], { type: 'query', input: undefined }))
      .toEqual(['__ORPC__', ['path'], { type: 'query' }])

    expect(buildKey(['path'], { type: undefined, input: undefined }))
      .toEqual(['__ORPC__', ['path'], { }])
  })
})
