import type { JsonValue } from '@orpc/server-standard'
import type { PublicOpenAPIJsonSerializer } from './json-serializer'
import { ErrorEvent, isAsyncIteratorObject } from '@orpc/server-standard'
import { findDeepMatches } from '@orpc/shared'
import { ORPCError, toORPCError } from '../error'
import { mapEventIterator } from '../event-iterator'
import * as BracketNotation from './bracket-notation'
import { OpenAPIJsonSerializer } from './json-serializer'

export interface OpenAPISerializerOptions {
  jsonSerializer?: PublicOpenAPIJsonSerializer
}

export class OpenAPISerializer {
  private readonly jsonSerializer: PublicOpenAPIJsonSerializer

  constructor(options?: OpenAPISerializerOptions) {
    this.jsonSerializer = options?.jsonSerializer ?? new OpenAPIJsonSerializer()
  }

  serialize(data: unknown): unknown {
    if (data instanceof Blob || data === undefined) {
      return data
    }

    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => this.jsonSerializer.serialize(value),
        error: async (e) => {
          if (e instanceof ErrorEvent) {
            return new ErrorEvent({
              data: this.jsonSerializer.serialize(e.data) as JsonValue,
              cause: e,
            })
          }

          return new ErrorEvent({
            data: this.jsonSerializer.serialize(toORPCError(e).toJSON()) as JsonValue,
            cause: e,
          })
        },
      })
    }

    const serializedJSON = this.jsonSerializer.serialize(data)
    const { values: blobs } = findDeepMatches(v => v instanceof Blob, serializedJSON)

    if (blobs.length === 0) {
      return serializedJSON
    }

    const form = new FormData()

    for (const [path, value] of BracketNotation.serialize(serializedJSON)) {
      if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
      ) {
        form.append(path, value.toString())
      }
      else if (value instanceof Date) {
        form.append(path, value.toISOString())
      }
      else if (value instanceof Blob) {
        form.append(path, value)
      }
    }

    return form
  }

  deserialize(serialized: unknown): unknown {
    if (serialized instanceof URLSearchParams || serialized instanceof FormData) {
      return BracketNotation.deserialize([...serialized.entries()])
    }

    if (isAsyncIteratorObject(serialized)) {
      return mapEventIterator(serialized, {
        value: async value => value,
        error: async (e) => {
          if (e instanceof ErrorEvent && ORPCError.isValidJSON(e.data)) {
            return ORPCError.fromJSON(e.data, { cause: e })
          }

          return e
        },
      })
    }

    return serialized
  }
}
