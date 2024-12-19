import { client } from './helpers'

describe('e2e', () => {
  it('works on success', () => {
    expect(client.ping()).resolves.toEqual('pong')
  })

  it('works on error', () => {
    // @ts-expect-error - invalid input
    expect(client.user.find()).rejects.toThrowError(
      'Input validation failed',
    )
  })

  it('works on file upload', () => {
    const file = new Blob(['hello'], { type: 'text/plain;charset=utf-8' })
    expect(client.nested.countFileSize(file)).resolves.toEqual(5)
  })
})
