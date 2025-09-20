import { getSignedValue, sign, unsign } from '@orpc/server/helpers'
import { parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import * as v from 'valibot'
import { DurableIteratorError } from './error'

export type DurableIteratorTokenPayload = v.InferOutput<typeof DurableIteratorTokenPayloadSchema>

const DurableIteratorTokenPayloadSchema = v.object({
  chn: v.pipe(v.string(), v.description('Channel name')),
  tags: v.pipe(v.optional(v.array(v.string())), v.readonly(), v.description('Tags')),
  att: v.pipe(v.optional(v.unknown()), v.description('Attachment')),
  rpc: v.pipe(v.optional(v.array(v.string())), v.readonly(), v.description('Allowed remote methods')),
  iat: v.pipe(v.number(), v.description('Issued at time in seconds')),
  exp: v.pipe(v.number(), v.description('Expiration time in seconds')),
})

/**
 * Signs and encodes a token payload.
 */
export function signDurableIteratorToken(secret: string, payload: DurableIteratorTokenPayload): Promise<string> {
  return sign(stringifyJSON(payload), secret)
}

/**
 * Verifies a token and returns the payload if valid.
 */
export async function verifyDurableIteratorToken(secret: string, token: string): Promise<DurableIteratorTokenPayload | undefined> {
  try {
    const payload = parseEmptyableJSON(await unsign(token, secret))

    if (!v.is(DurableIteratorTokenPayloadSchema, payload)) {
      return undefined
    }

    if (payload.exp < (Date.now() / 1000)) {
      return undefined
    }

    return payload
  }
  catch {
    // parseEmptyableJSON can throw error if the token contains invalid json
    return undefined
  }
}

/**
 * Extracts the payload from a token without verifying its signature.
 *
 * @throws if invalid format
 */
export function parseDurableIteratorToken(token: string | null | undefined): DurableIteratorTokenPayload {
  try {
    const payload = parseEmptyableJSON(getSignedValue(token))
    return v.parse(DurableIteratorTokenPayloadSchema, payload)
  }
  catch (error) {
    throw new DurableIteratorError('Invalid token payload', { cause: error })
  }
}
