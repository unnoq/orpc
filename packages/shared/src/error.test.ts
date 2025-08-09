import { AbortError } from './error'

it('abortError', () => {
  const error = new AbortError('Operation aborted', {
    cause: '__cause__',
  })
  expect(error.name).toBe('AbortError')
  expect(error.message).toBe('Operation aborted')
  expect(error.cause).toBe('__cause__')
})
