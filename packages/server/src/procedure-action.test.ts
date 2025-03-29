import { ORPCError } from '@orpc/client'
import { createActionableClient } from './procedure-action'

describe('createActionableClient', () => {
  const client = vi.fn()
  const action = createActionableClient(client)

  it('on success', async () => {
    client.mockResolvedValueOnce('__mocked__')
    const result = await action('input')
    expect(result).toEqual([null, '__mocked__'])
    expect(client).toHaveBeenCalledWith('input')
  })

  it('on throw ORPCError', async () => {
    client.mockRejectedValueOnce(new ORPCError('CODE', { message: 'message', data: { foo: 'bar' } }))
    const result = await action('input')
    expect(result).toEqual([{ code: 'CODE', message: 'message', data: { foo: 'bar' }, defined: false, status: 500 }, undefined])
    expect(client).toHaveBeenCalledWith('input')
  })

  it('on throw non-ORPCError', async () => {
    client.mockRejectedValueOnce(new Error('Some error'))
    const result = await action('input')
    expect(result).toEqual([{ code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error', data: undefined, defined: false, status: 500 }, undefined])
    expect(client).toHaveBeenCalledWith('input')
  })

  it('ignore second argument', async () => {
    /** This important because second argument is not validate so we should prevent user from passing it */

    client.mockResolvedValueOnce('__mocked__')
    const result = await (action as any)('input', 'second')
    expect(result).toEqual([null, '__mocked__'])
    expect(client).toHaveBeenCalledWith('input')
  })
})
