import { fallback, value } from './value'

it('value', async () => {
  expect(value(42)).toBe(42)
  expect(value(() => 42)).toBe(42)
  expect(await value(async () => 42)).toBe(42)

  expect(await value(async () => ({
    then: (resolve: (value: PromiseLike<number>) => void) => resolve(Promise.resolve(42)),
  }))).toBe(42)

  expect(value(() => ({ value: '42' }))).toEqual({ value: '42' })
})

it('fallback', () => {
  expect(fallback(42, 0)).toBe(42)
  expect(fallback(undefined, 0)).toBe(0)
})
