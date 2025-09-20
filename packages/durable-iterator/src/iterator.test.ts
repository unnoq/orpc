import { describe, expect, it } from 'vitest'
import { getClientDurableIteratorToken } from './client'
import { DurableIterator } from './iterator'
import { verifyDurableIteratorToken } from './schemas'

describe('durableIterator', () => {
  const testChannel = 'test-channel'
  const testSigningKey = 'test-signing-key-32-chars-long-123'

  it('rpc: should return new instance with rpc methods specified', () => {
    const options = {
      att: { userId: 'user123' },
      signingKey: testSigningKey,
    }

    const iterator = new DurableIterator(testChannel, options) as any
    const rpcIterator = iterator.rpc('getUser', 'sendMessage')

    expect(rpcIterator).toBeInstanceOf(DurableIterator)
    expect(rpcIterator).not.toBe(iterator) // Should be a new instance
  })

  describe('.then: ClientDurableIterator', () => {
    it('token & throw when interacting with client iterator', async () => {
      const date = new Date()
      const options = {
        tags: ['tag1', 'tag2'],
        att: { userId: 'user123' },
        rpc: ['getUser', 'sendMessage'] as any,
        signingKey: testSigningKey,
      }
      const iterator = new DurableIterator(testChannel, options) as any
      const clientIterator = await iterator

      const token = getClientDurableIteratorToken(clientIterator)
      expect(token).toBeDefined()
      const payload = await verifyDurableIteratorToken(testSigningKey, token!)

      expect(payload?.chn).toBe(testChannel)
      expect(payload?.tags).toEqual(['tag1', 'tag2'])
      expect(payload?.att).toEqual({ userId: 'user123' })
      expect(payload?.rpc).toEqual(['getUser', 'sendMessage'])
      expect(payload?.iat).toEqual(Math.floor(date.getTime() / 1000))
      expect(payload?.exp).toEqual(Math.floor(date.getTime() / 1000) + 60 * 60 * 24)

      await expect(clientIterator.next()).rejects.toThrow()
      await expect(clientIterator.getUser()).rejects.toThrow()
    })

    it('can change token TTL', async () => {
      const date = new Date()
      const options = {
        tokenTTLSeconds: 3600, // 1 hour
        signingKey: testSigningKey,
      }

      const iterator = new DurableIterator(testChannel, options) as any
      const clientIterator = await iterator
      const token = getClientDurableIteratorToken(clientIterator)
      const payload = await verifyDurableIteratorToken(testSigningKey, token!)

      expect(payload?.exp).toEqual(Math.floor(date.getTime() / 1000) + 3600)
    })
  })
})
