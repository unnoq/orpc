import { ORPCError, os } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supportedDataTypes } from '../../../tests/shared'
import { RPCLink } from './rpc-link'

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(supportedDataTypes)('rpcLink: $name', ({ value, expected }) => {
  describe.each(['GET', 'POST'] as const)('method: %s', (method) => {
    async function assertSuccessCase(value: unknown, expected: unknown): Promise<true> {
      const handler = vi.fn(({ input }) => input)

      const rpcHandler = new RPCHandler(os.handler(handler))

      const rpcLink = new RPCLink({
        url: 'http://api.example.com',
        method,
        fetch: async (request) => {
          const { matched, response } = await rpcHandler.handle(request)

          if (matched) {
            return response
          }

          throw new Error('No procedure match')
        },
      })

      const output = await rpcLink.call([], value, { context: {} })

      expect(output).toEqual(expected)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ input: expected }))

      return true
    }

    async function assertErrorCase(value: unknown, expected: unknown): Promise<true> {
      const handler = vi.fn(({ input }) => {
        throw new ORPCError('TEST', {
          data: input,
        })
      })

      const rpcHandler = new RPCHandler(os.handler(handler))

      const rpcLink = new RPCLink({
        url: 'http://api.example.com',
        method,
        fetch: async (request) => {
          const { matched, response } = await rpcHandler.handle(request)

          if (matched) {
            return response
          }

          throw new Error('No procedure match')
        },
      })

      await expect(rpcLink.call([], value, { context: {} })).rejects.toSatisfy((e) => {
        expect(e).toBeInstanceOf(ORPCError)
        expect(e.code).toBe('TEST')
        expect(e.data).toEqual(expected)

        return true
      })

      return true
    }

    it('should work on flat', async () => {
      expect(await assertSuccessCase(value, expected)).toBe(true)
      expect(await assertErrorCase(value, expected)).toBe(true)
    })

    it('should work on nested object', async () => {
      expect(await assertSuccessCase({ data: value }, { data: expected })).toBe(true)
      expect(await assertErrorCase({ data: value }, { data: expected })).toBe(true)
    })

    it('should work on complex object', async () => {
      expect(await assertSuccessCase({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }, {
        '!@#$%^^&()[]>?<~_<:"~+!_': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
        'nested': {
          nested: expected,
        },
      })).toBe(true)

      expect(await assertErrorCase({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }, {
        '!@#$%^^&()[]>?<~_<:"~+!_': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
        'nested': {
          nested: expected,
        },
      })).toBe(true)
    })
  })
})
