import type { TokenPayload } from './schemas'
import { sign } from '@orpc/server/helpers'
import { describe, expect, it } from 'vitest'
import { parseToken, signToken, verifyToken } from './schemas'

describe('signToken', () => {
  it('should sign a token payload and return a string', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await signToken('secret-key', payload)

    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('should produce different tokens for different payloads', async () => {
    const payload1: TokenPayload = {
      id: 'client-1',
      chn: 'channel-1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const payload2: TokenPayload = {
      id: 'client-2',
      chn: 'channel-2',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token1 = await signToken('secret-key', payload1)
    const token2 = await signToken('secret-key', payload2)

    expect(token1).not.toBe(token2)
  })

  it('should produce different tokens for different secrets', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token1 = await signToken('secret-1', payload)
    const token2 = await signToken('secret-2', payload)

    expect(token1).not.toBe(token2)
  })
})

describe('verifyToken', () => {
  it('should verify a valid token and return the payload', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      att: { userId: 'user-456' },
      rpc: ['getUser', 'sendMessage'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await signToken('secret-key', payload)
    const verifiedPayload = await verifyToken('secret-key', token)

    expect(verifiedPayload).toEqual(payload)
  })

  it('should return undefined for an expired token', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    }

    const token = await signToken('secret-key', payload)
    const verifiedPayload = await verifyToken('secret-key', token)

    expect(verifiedPayload).toBeUndefined()
  })

  it('should return undefined for a token with wrong secret', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await signToken('secret-key', payload)
    const verifiedPayload = await verifyToken('wrong-secret', token)

    expect(verifiedPayload).toBeUndefined()
  })

  it('should return undefined for an invalid token format', async () => {
    const invalidToken = 'invalid-token-format'
    const verifiedPayload = await verifyToken('secret-key', invalidToken)

    expect(verifiedPayload).toBeUndefined()
  })

  it('should return undefined for a token with invalid payload structure', async () => {
    // Create a token with invalid payload structure
    const invalidPayload = {
      id: 123, // should be string
      chn: 'test-channel',
      iat: 'invalid', // should be number
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    // We need to bypass type checking to create an invalid token
    const token = await signToken('secret-key', invalidPayload as any)
    const verifiedPayload = await verifyToken('secret-key', token)

    expect(verifiedPayload).toBeUndefined()
  })

  it('should handle edge case where exp equals current time', async () => {
    const currentTime = Math.floor(Date.now() / 1000)
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      iat: currentTime,
      exp: currentTime, // expires exactly now
    }

    const token = await signToken('secret-key', payload)

    // Since exp < Date.now() / 1000, it should be considered expired
    const verifiedPayload = await verifyToken('secret-key', token)
    expect(verifiedPayload).toBeUndefined()
  })

  it('should handle token with malformed JSON', async () => {
    // Create a token that will have malformed JSON when parsed
    const malformedToken = await sign('invalid-json', 'secret-key')
    const verifiedPayload = await verifyToken('secret-key', malformedToken)

    expect(verifiedPayload).toBeUndefined()
  })
})

describe('parseToken', () => {
  it('should parse a valid token and return the payload', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      att: { userId: 'user-456' },
      rpc: ['getUser', 'sendMessage'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await signToken('secret-key', payload)
    const parsedPayload = parseToken(token)

    expect(parsedPayload).toEqual(payload)
  })

  it('should parse an expired token (does not check expiration)', async () => {
    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600, // expired
    }

    const token = await signToken('secret-key', payload)
    const parsedPayload = parseToken(token)

    // parseToken should return the payload even if expired
    expect(parsedPayload).toEqual(payload)
  })

  it('should throw error for invalid token format', () => {
    const invalidToken = 'invalid-token-format'

    expect(() => parseToken(invalidToken)).toThrow()
  })

  it('should throw error for token with invalid payload structure', async () => {
    // Create a token with invalid payload structure
    const invalidPayload = {
      id: 123, // should be string
      chn: 'test-channel',
      iat: 'invalid', // should be number
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await signToken('secret-key', invalidPayload as any)

    expect(() => parseToken(token)).toThrow()
  })

  it('should throw error for token with malformed JSON', () => {
    const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-json.signature'

    expect(() => parseToken(malformedToken)).toThrow()
  })

  it('should handle token with missing required fields', async () => {
    const incompletePayload = {
      id: 'client-123',
      // missing required fields
    }

    const token = await signToken('secret-key', incompletePayload as any)

    expect(() => parseToken(token)).toThrow()
  })
})

describe('integration tests', () => {
  it('should handle complete sign -> verify -> parse flow', async () => {
    const originalPayload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      att: { userId: 'user-456', role: 'admin' },
      rpc: ['getUser', 'sendMessage', 'deleteMessage'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    // Sign the token
    const token = await signToken('secret-key', originalPayload)

    // Verify the token
    const verifiedPayload = await verifyToken('secret-key', token)
    expect(verifiedPayload).toEqual(originalPayload)

    // Parse the token (without verification)
    const parsedPayload = parseToken(token)
    expect(parsedPayload).toEqual(originalPayload)
  })

  it('should handle tokens with complex attachment data', async () => {
    const complexAttachment = {
      user: {
        id: 'user-123',
        profile: {
          name: 'John Doe',
          email: 'john@example.com',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
      },
      permissions: ['read', 'write', 'admin'],
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
      },
    }

    const payload: TokenPayload = {
      id: 'client-123',
      chn: 'test-channel',
      att: complexAttachment,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await signToken('secret-key', payload)
    const verifiedPayload = await verifyToken('secret-key', token)

    expect(verifiedPayload).toEqual(payload)
    expect(verifiedPayload?.att).toEqual(complexAttachment)
  })
})
