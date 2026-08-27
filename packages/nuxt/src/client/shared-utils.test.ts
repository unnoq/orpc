import { generateOperationKey } from './key'
import { SharedUtils } from './shared-utils'

describe('sharedUtils', () => {
  const utils = new SharedUtils(['test', 'path'], {})

  describe('.matcher', () => {
    it('strategy=partial', () => {
      expect(utils.matcher()(generateOperationKey(['test', 'path'], { input: { value1: 'test' } }))).toBe(true)
      expect(utils.matcher()(generateOperationKey(['test', 'path']))).toBe(true)
      expect(utils.matcher()(generateOperationKey(['invalid'], { input: { value1: 'test' } }))).toBe(false)

      expect(utils.matcher({ input: { value1: true } })(generateOperationKey(['test', 'path'], { input: { value1: true, value2: true } }))).toBe(true)
      expect(utils.matcher({ input: { value1: true } })(generateOperationKey(['test', 'path'], { input: { value1: false, value2: true } }))).toBe(false)
    })

    it('strategy=exact', () => {
      expect(utils.matcher({ strategy: 'exact', input: { value1: 'test' } })(generateOperationKey(['test', 'path'], { input: { value1: 'test' } }))).toBe(true)
      expect(utils.matcher({ strategy: 'exact' })(generateOperationKey(['test', 'path'], { input: { value1: 'test' } }))).toBe(false)
      expect(utils.matcher({ strategy: 'exact', input: { value1: 'test' } })(generateOperationKey(['invalid'], { input: { value1: 'test' } }))).toBe(false)
    })

    it('with prefix', () => {
      const prefixedUtils = new SharedUtils(['test', 'path'], { prefix: '__prefix__' })

      expect(prefixedUtils.matcher()(generateOperationKey(['test', 'path'], { prefix: '__prefix__', input: { value1: 'test' } }))).toBe(true)
      expect(prefixedUtils.matcher()(generateOperationKey(['test', 'path'], { input: { value1: 'test' } }))).toBe(false)
      expect(prefixedUtils.matcher()(generateOperationKey(['test', 'path'], { prefix: '__invalid__', input: { value1: 'test' } }))).toBe(false)

      expect(prefixedUtils.matcher({ strategy: 'exact', input: { value1: 'test' } })(generateOperationKey(['test', 'path'], { prefix: '__prefix__', input: { value1: 'test' } }))).toBe(true)
      expect(prefixedUtils.matcher({ strategy: 'exact' })(generateOperationKey(['test', 'path'], { prefix: '__prefix__', input: { value1: 'test' } }))).toBe(false)
    })

    it('serializes the expected input before matching', () => {
      expect(utils.matcher({ input: { date: new Date('2020-01-01T00:00:00.000Z') } })(
        generateOperationKey(['test', 'path'], { input: { date: new Date('2020-01-01T00:00:00.000Z') } }),
      )).toBe(true)
    })

    it('rejects foreign keys', () => {
      expect(utils.matcher()('not-json')).toBe(false)
      expect(utils.matcher()('["test","path"]')).toBe(false)
    })
  })
})
