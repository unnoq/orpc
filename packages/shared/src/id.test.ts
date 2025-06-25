import { SequentialIdGenerator } from './id'

describe('sequentialIdGenerator', () => {
  it('unique and increase', () => {
    const idGenerator = new SequentialIdGenerator()

    expect(idGenerator.generate()).toBe('0')
    expect(idGenerator.generate()).toBe('1')
    expect(idGenerator.generate()).toBe('2')
    expect(idGenerator.generate()).toBe('3')

    for (let i = 4; i < 1000; i++) {
      expect(idGenerator.generate()).toBe(i.toString(32))
    }
  })

  it('large range', () => {
    const idGenerator = new SequentialIdGenerator()
    const generatedIds = new Set<string>()

    const size = 100_000

    for (let i = 0; i < size; i++) {
      const id = idGenerator.generate()
      generatedIds.add(id)
    }

    expect(generatedIds.size).toBe(size)
  })
})
