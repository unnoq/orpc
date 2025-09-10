import { getSignedValue, sign, unsign } from '@orpc/server/helpers'
import { parseEmptyableJSON, stringifyJSON } from '@orpc/shared'
import * as v from 'valibot'

export type TokenPayload = v.InferOutput<typeof TokenPayloadSchema>

export const TokenPayloadSchema = v.object({
  id: v.pipe(v.string(), v.description('Unique identifier per client')),
  chn: v.pipe(v.string(), v.description('Channel name')),
  att: v.pipe(v.optional(v.any()), v.description('Attachment')),
  rpc: v.pipe(v.optional(v.array(v.string())), v.readonly(), v.description('Allowed remote methods')),
  iat: v.pipe(v.number(), v.description('Issued at time in seconds')),
  exp: v.pipe(v.number(), v.description('Expiration time in seconds')),
})

/**
 * Signs and encodes a token payload.
 */
export function signToken(secret: string, payload: TokenPayload): Promise<string> {
  return sign(stringifyJSON(payload), secret)
}

/**
 * Verifies a token and returns the payload if valid.
 */
export async function verifyToken(secret: string, token: string): Promise<TokenPayload | undefined> {
  try {
    const payload = parseEmptyableJSON(await unsign(token, secret))

    if (!v.is(TokenPayloadSchema, payload)) {
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
export function parseToken(token: string): TokenPayload {
  const payload = parseEmptyableJSON(getSignedValue(token))
  return v.parse(TokenPayloadSchema, payload)
}
