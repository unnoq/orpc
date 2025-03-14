import type { StandardBracketNotationSerializer } from './bracket-notation'
import type { StandardOpenAPIJsonSerializer } from './openapi-json-serializer'
import { mapEventIterator, ORPCError, toORPCError } from '@orpc/client'
import { isAsyncIteratorObject } from '@orpc/shared'
import { ErrorEvent } from '@orpc/standard-server'

export class StandardOpenAPISerializer {
  constructor(
    private readonly jsonSerializer: StandardOpenAPIJsonSerializer,
    private readonly bracketNotation: StandardBracketNotationSerializer,
  ) {
  }

  serialize(data: unknown): unknown {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => this.#serialize(value, false),
        error: async (e) => {
          return new ErrorEvent({
            data: this.#serialize(toORPCError(e).toJSON(), false),
            cause: e,
          })
        },
      })
    }

    return this.#serialize(data, true)
  }

  #serialize(data: unknown, enableFormData: boolean): unknown {
    if (data instanceof Blob || data === undefined) {
      return data
    }

    const [json, hasBlob] = this.jsonSerializer.serialize(data)

    if (!enableFormData || !hasBlob) {
      return json
    }

    const form = new FormData()

    for (const [path, value] of this.bracketNotation.serialize(json)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        form.append(path, value.toString())
      }
      else if (value instanceof Blob) {
        form.append(path, value)
      }
    }

    return form
  }

  deserialize(data: unknown): unknown {
    if (data instanceof URLSearchParams || data instanceof FormData) {
      return this.bracketNotation.deserialize(Array.from(data.entries()))
    }

    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => value,
        error: async (e) => {
          if (e instanceof ErrorEvent && ORPCError.isValidJSON(e.data)) {
            return ORPCError.fromJSON(e.data, { cause: e })
          }

          return e
        },
      })
    }

    return data
  }
}
