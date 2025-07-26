import { sign, unsign } from './signing'

describe('signing', () => {
  const secret = 'test-secret-key'
  const value = 'user123'

  describe('sign', () => {
    it('should sign a value and return signed string with signature', async () => {
      const signedValue = await sign(value, secret)

      expect(signedValue).toContain('.')
      expect(signedValue.startsWith(`${value}.`)).toBe(true)

      const parts = signedValue.split('.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toBe(value)
      expect(parts[1]).toBeTruthy() // Should have a signature part
    })

    it('should produce consistent signatures for same input', async () => {
      const signedValue1 = await sign(value, secret)
      const signedValue2 = await sign(value, secret)

      expect(signedValue1).toBe(signedValue2)
    })

    it('should produce different signatures for different secrets', async () => {
      const signedValue1 = await sign(value, secret)
      const signedValue2 = await sign(value, 'different-secret')

      expect(signedValue1).not.toBe(signedValue2)
    })

    it('should produce different signatures for different values', async () => {
      const signedValue1 = await sign(value, secret)
      const signedValue2 = await sign('different-value', secret)

      expect(signedValue1).not.toBe(signedValue2)
    })

    it('should handle empty string values', async () => {
      const signedValue = await sign('', secret)

      expect(signedValue).toContain('.')
      expect(signedValue.startsWith('.')).toBe(true)
    })

    it('should handle values with dots', async () => {
      const valueWithDot = 'user.123.test'
      const signedValue = await sign(valueWithDot, secret)

      expect(signedValue).toContain('.')
      expect(signedValue.startsWith(`${valueWithDot}.`)).toBe(true)
    })

    it('should handle special characters in value', async () => {
      const specialValue = 'user@domain.com!#$%'
      const signedValue = await sign(specialValue, secret)

      expect(signedValue).toContain('.')
      expect(signedValue.startsWith(`${specialValue}.`)).toBe(true)
    })

    it('should handle unicode characters', async () => {
      const unicodeValue = 'user-🚀-test-中文'
      const signedValue = await sign(unicodeValue, secret)

      expect(signedValue).toContain('.')
      expect(signedValue.startsWith(`${unicodeValue}.`)).toBe(true)
    })
  })

  describe('unsign', () => {
    it('should successfully unsign a valid signed value', async () => {
      const signedValue = await sign(value, secret)
      const unsignedValue = await unsign(signedValue, secret)

      expect(unsignedValue).toBe(value)
    })

    it('should return undefined for undefined/null input', async () => {
      expect(await unsign(undefined, secret)).toBeUndefined()
      expect(await unsign(null, secret)).toBeUndefined()
    })

    it('should return undefined for invalid signature', async () => {
      const signedValue = await sign(value, secret)
      const unsignedValue = await unsign(signedValue, 'wrong-secret')

      expect(unsignedValue).toBeUndefined()
    })

    it('should return undefined for tampered value', async () => {
      const signedValue = await sign(value, secret)
      const tamperedValue = signedValue.replace(value, 'tampered')
      const unsignedValue = await unsign(tamperedValue, secret)

      expect(unsignedValue).toBeUndefined()
    })

    it('should return undefined for tampered signature', async () => {
      const signedValue = await sign(value, secret)
      const parts = signedValue.split('.')
      const tamperedSignedValue = `${parts[0]}.tamperedsignature`
      const unsignedValue = await unsign(tamperedSignedValue, secret)

      expect(unsignedValue).toBeUndefined()
    })

    it('should return undefined for value without dot separator', async () => {
      const unsignedValue = await unsign('no-dot-separator', secret)

      expect(unsignedValue).toBeUndefined()
    })

    it('should return undefined for empty signature part', async () => {
      const invalidSignedValue = `${value}.`
      const unsignedValue = await unsign(invalidSignedValue, secret)

      expect(unsignedValue).toBeUndefined()
    })

    it('should return undefined for invalid base64url signature', async () => {
      const invalidSignedValue = `${value}.invalid@base64url!`
      const unsignedValue = await unsign(invalidSignedValue, secret)

      expect(unsignedValue).toBeUndefined()
    })

    it('should handle values with multiple dots correctly', async () => {
      const valueWithDots = 'user.123.test'
      const signedValue = await sign(valueWithDots, secret)
      const unsignedValue = await unsign(signedValue, secret)

      expect(unsignedValue).toBe(valueWithDots)
    })

    it('should handle empty string values', async () => {
      const emptyValue = ''
      const signedValue = await sign(emptyValue, secret)
      const unsignedValue = await unsign(signedValue, secret)

      expect(unsignedValue).toBe(emptyValue)
    })

    it('should handle special characters', async () => {
      const specialValue = 'user@domain.com!#$%'
      const signedValue = await sign(specialValue, secret)
      const unsignedValue = await unsign(signedValue, secret)

      expect(unsignedValue).toBe(specialValue)
    })

    it('should handle unicode characters', async () => {
      const unicodeValue = 'user-🚀-test-中文'
      const signedValue = await sign(unicodeValue, secret)
      const unsignedValue = await unsign(signedValue, secret)

      expect(unsignedValue).toBe(unicodeValue)
    })

    it('should return undefined for malformed input that throws errors', async () => {
      // Test various malformed inputs that might cause crypto operations to throw
      const malformedInputs = [
        'value.',
        '.signature',
        'value.invalid-signature-length',
        'value.!@#$%^&*()',
      ]

      for (const input of malformedInputs) {
        const unsignedValue = await unsign(input, secret)
        expect(unsignedValue).toBeUndefined()
      }
    })
  })

  describe('integration tests', () => {
    it('should maintain integrity through sign/unsign cycle', async () => {
      const testValues = [
        'simple',
        '',
        'with.dots',
        'with spaces and special chars!@#',
        '🚀 unicode test 中文',
        'very-long-value-that-might-test-edge-cases-in-the-crypto-implementation-and-base64url-encoding',
      ]

      for (const testValue of testValues) {
        const signedValue = await sign(testValue, secret)
        const unsignedValue = await unsign(signedValue, secret)
        expect(unsignedValue).toBe(testValue)
      }
    })

    it('should fail unsign with different secrets', async () => {
      const secrets = ['secret1', 'secret2', 'different-secret']

      for (let i = 0; i < secrets.length; i++) {
        const currentSecret = secrets[i]!
        const signedValue = await sign(value, currentSecret)

        for (let j = 0; j < secrets.length; j++) {
          const testSecret = secrets[j]!
          const unsignedValue = await unsign(signedValue, testSecret)

          if (i === j) {
            expect(unsignedValue).toBe(value)
          }
          else {
            expect(unsignedValue).toBeUndefined()
          }
        }
      }
    })

    it('should produce consistent results across multiple operations', async () => {
      const results = []

      for (let i = 0; i < 10; i++) {
        const signedValue = await sign(value, secret)
        const unsignedValue = await unsign(signedValue, secret)
        results.push({ signed: signedValue, unsigned: unsignedValue })
      }

      // All signed values should be identical
      const firstSigned = results[0]!.signed
      expect(results.every(r => r.signed === firstSigned)).toBe(true)

      // All unsigned values should be identical and match original
      expect(results.every(r => r.unsigned === value)).toBe(true)
    })
  })
})
