import type { StandardHeaders } from '@standardserver/core'
import type { OpenAPISerializer } from '../../openapi-serializer'
import { isTypescriptObject, NullProtoObj } from '@orpc/shared'

export function serializeHeaders(
  headers: object,
  serializer: Pick<OpenAPISerializer, 'serialize'>,
): StandardHeaders {
  const result = new NullProtoObj<Record<string, string | string[]>>()

  for (const [key, value] of Object.entries(headers)) {
    const serialized = serializer.serialize(value)

    if (Array.isArray(serialized)) {
      result[key] = serialized
        .filter(item => item !== undefined && item !== null)
        .map(String)
    }

    else if (isTypescriptObject(serialized)) {
      result[key] = Object.entries(serialized)
        .filter(([, val]) => val !== undefined && val !== null)
        .map(([key, val]) => `${String(key)},${String(val)}`)
        .join(',')
    }

    else if (serialized !== undefined && serialized !== null) {
      result[key] = String(serialized)
    }
  }

  return result
}
