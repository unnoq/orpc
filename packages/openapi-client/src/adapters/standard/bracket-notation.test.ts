import { StandardBracketNotationSerializer } from './bracket-notation'

describe('standardBracketNotationSerializer', () => {
  const serializer = new StandardBracketNotationSerializer()

  it('.stringifyPath', () => {
    expect(serializer.stringifyPath([])).toBe('')
    expect(serializer.stringifyPath(['a', 'b', 'c', 1, 2, 3])).toBe('a[b][c][1][2][3]')
    expect(serializer.stringifyPath(['\\a', '[b]', '\\c[d]'])).toBe('\\\\a[\\[b\\]][\\\\c\\[d\\]]')
  })

  it('.parsePath', () => {
    expect(serializer.parsePath('')).toEqual([''])
    expect(serializer.parsePath('a[b][c][1][2][3]')).toEqual(['a', 'b', 'c', '1', '2', '3'])
    expect(serializer.parsePath('\\\\a[\\[b\\]][\\\\c\\[d\\]]')).toEqual(['\\a', '[b]', '\\c[d]'])
    expect(serializer.parsePath('a[b]c[d]')).toEqual(['a', 'b]c[d'])
    expect(serializer.parsePath('a[b]c[d')).toEqual(['a[b]c[d'])
    expect(serializer.parsePath('a[[b]]')).toEqual(['a', '[b]'])
    expect(serializer.parsePath('a\\[[b]]')).toEqual(['a[', 'b]'])
    expect(serializer.parsePath('abc[]')).toEqual(['abc', ''])

    expect(serializer.parsePath('abc[def')).toEqual(['abc[def'])
    expect(serializer.parsePath('abc[d][ef')).toEqual(['abc[d][ef'])
    expect(serializer.parsePath('abc[d][')).toEqual(['abc[d]['])
    expect(serializer.parsePath('abc[')).toEqual(['abc['])
    expect(serializer.parsePath('abc]')).toEqual(['abc]'])
  })

  it.each([
    [['a', 'b', 'c']],
    [['\\a', '[b]', '\\c[d]']],
    [['[]', '[b]]]', '\\c[d\\][]']],
    [['', '', '']],
  ])('.stringifyPath + .parsePath', (segments) => {
    expect(serializer.parsePath(serializer.stringifyPath(segments))).toEqual(segments)
  })

  describe('.serialize', () => {
    it('can serialize primitive values', () => {
      expect(serializer.serialize(1)).toEqual([
        ['', 1],
      ])
    })

    it('can serialize objects', () => {
      expect(serializer.serialize({ a: 1, b: 2, c: 3 })).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])
    })

    it('can serialize arrays', () => {
      expect(serializer.serialize([1, 2, 3])).toEqual([
        ['0', 1],
        ['1', 2],
        ['2', 3],
      ])
    })

    it('can serialize nested objects', () => {
      expect(serializer.serialize({ a: { b: { c: 1, d: 2 }, e: 3, f: 4 } })).toEqual([
        ['a[b][c]', 1],
        ['a[b][d]', 2],
        ['a[e]', 3],
        ['a[f]', 4],
      ])
    })

    it('can serialize nested arrays', () => {
      expect(serializer.serialize({ a: [[1, 2], 3, 4] })).toEqual([
        ['a[0][0]', 1],
        ['a[0][1]', 2],
        ['a[1]', 3],
        ['a[2]', 4],
      ])
    })

    it('can serialize mixed nested structures', () => {
      expect(serializer.serialize({ a: { b: 1, c: [2, { d: 3, f: 4 }] } })).toEqual([
        ['a[b]', 1],
        ['a[c][0]', 2],
        ['a[c][1][d]', 3],
        ['a[c][1][f]', 4],
      ])
    })
  })

  describe('.deserialize', () => {
    it('can deserialize empty objects', () => {
      expect(serializer.deserialize([])).toEqual({})
    })

    it('can deserialize arrays', () => {
      expect(serializer.deserialize([
        ['', 1],
        ['', 2],
        ['', 3],
      ])).toEqual([1, 2, 3])

      expect(serializer.deserialize([
        ['0', 1],
        ['1', 2],
        ['2', 3],
      ])).toEqual([1, 2, 3])
    })

    it('can deserialize arrays missing items', () => {
      expect(serializer.deserialize([
        ['0', 1],
        ['2', 2],
      ])).toEqual([1, undefined, 2])
    })

    it('can deserialize objects', () => {
      expect(serializer.deserialize([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('can deserialize number-key objects', () => {
      expect(serializer.deserialize([
        ['0', 1],
        ['1', 2],
        ['a', 3],
      ])).toEqual({ 0: 1, 1: 2, a: 3 })

      expect(serializer.deserialize([
        ['a', 3],
        ['0', 1],
        ['1', 2],
      ])).toEqual({ 0: 1, 1: 2, a: 3 })
    })

    it('can deserialize empty-key objects', () => {
      expect(serializer.deserialize([
        ['', 1],
        ['a', 3],
      ])).toEqual({ '': 1, 'a': 3 })

      expect(serializer.deserialize([
        ['a', 3],
        ['', 1],
      ])).toEqual({ '': 1, 'a': 3 })

      expect(serializer.deserialize([
        ['[a]', 1],
        ['[b]', 3],
      ])).toEqual({ '': { a: 1, b: 3 } })
    })

    it('can deserialize objects when both number-key and empty-key appear', () => {
      expect(serializer.deserialize([
        ['0', 1],
        ['', 2],
      ])).toEqual({ '0': 1, '': 2 })
      expect(serializer.deserialize([
        ['', 2],
        ['0', 1],
      ])).toEqual({ '0': 1, '': 2 })
    })

    it('should be an array if conflict keys', () => {
      expect(serializer.deserialize([
        ['a', 1],
        ['a', 2],
      ])).toEqual({ a: [1, 2] })

      expect(serializer.deserialize([
        ['0', 1],
        ['0', 2],
      ])).toEqual([[1, 2]])

      expect(serializer.deserialize([
        ['a', 1],
        ['a', 2],
        ['a[2]', 3],
      ])).toEqual({ a: [1, 2, 3] })

      expect(serializer.deserialize([
        ['0', 1],
        ['0', 2],
        ['0[user]', 3],
      ])).toEqual([{
        0: 1,
        1: 2,
        user: 3,
      }])
    })

    it('should be an array if [] conflict keys', () => {
      expect(serializer.deserialize([
        ['users[]', 1],
        ['users[]', 2],
        ['users[name]', 3],
      ])).toEqual({
        users: {
          '': [1, 2],
          'name': 3,
        },
      })

      expect(serializer.deserialize([
        ['users[]', 1],
        ['users[]', 2],
        ['users[name][]', 3],
        ['users[name][]', 4],
        ['users[]', 5],
        ['users[name][]', 6],
      ])).toEqual({
        users: {
          '': [1, 2, 5],
          'name': [3, 4, 6],
        },
      })

      expect(serializer.deserialize([
        ['a[]', 1],
        ['a[b][]', 2],
        ['a[b][c][]', 3],
        ['a[]', 4],
        ['a[b][]', 5],
        ['a[b][c][]', 6],
      ])).toEqual({
        a: {
          '': [1, 4],
          'b': {
            '': [2, 5],
            'c': [3, 6],
          },
        },
      })
    })

    it('can deserialize mixed nested structures', () => {
      expect(serializer.deserialize([
        ['a[b]', 1],
        ['a[c][0]', 2],
        ['a[c][1][d]', 3],
        ['a[c][1][f]', 4],
      ])).toEqual({ a: { b: 1, c: [2, { d: 3, f: 4 }] } })
    })
  })

  it.each([
    [{ }],
    [{ a: 1, b: 2, c: [1, 2, { a: 1, b: 2 }, new Date(), new Blob([]), new Set([1, 2]), new Map([[1, 2]])] }],
  ])('.serialize + .deserialize', (value) => {
    expect(serializer.deserialize(serializer.serialize(value))).toEqual(value)
  })
})
