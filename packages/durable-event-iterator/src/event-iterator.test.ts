import { describe, expect, it } from 'vitest'
import { getClientDurableEventIteratorToken } from './client'
import { DurableEventIterator } from './event-iterator'
import { verifyToken } from './schemas'

describe('durableEventIterator', () => {
  const testChannel = 'test-channel'
  const testSigningKey = 'test-signing-key-32-chars-long-123'

  it('rpc: should return new instance with rpc methods specified', () => {
    const options = {
      att: { userId: 'user123' },
    }

    const iterator = new DurableEventIterator(testChannel, testSigningKey, options) as any
    const rpcIterator = iterator.rpc('getUser', 'sendMessage')

    expect(rpcIterator).toBeInstanceOf(DurableEventIterator)
    expect(rpcIterator).not.toBe(iterator) // Should be a new instance
  })

  describe('.then: ClientDurableEventIterator', () => {
    it('token & throw when interacting with client iterator', async () => {
      const date = new Date()
      const options = {
        att: { userId: 'user123' },
        rpc: ['getUser', 'sendMessage'] as any,
      }
      const iterator = new DurableEventIterator(testChannel, testSigningKey, options) as any
      const clientIterator = await iterator

      const token = getClientDurableEventIteratorToken(clientIterator)
      expect(token).toBeDefined()
      const payload = await verifyToken(testSigningKey, token!)

      expect(payload?.chn).toBe(testChannel)
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
      }

      const iterator = new DurableEventIterator(testChannel, testSigningKey, options) as any
      const clientIterator = await iterator
      const token = getClientDurableEventIteratorToken(clientIterator)
      const payload = await verifyToken(testSigningKey, token!)

      expect(payload?.exp).toEqual(Math.floor(date.getTime() / 1000) + 3600)
    })
  })
})
