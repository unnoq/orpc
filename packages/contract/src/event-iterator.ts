import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Schema } from './schema'
import { getEventMeta, isAsyncIteratorObject, isEventMetaContainer, withEventMeta } from '@orpc/server-standard'
import { ValidationError } from './error'
import { ORPCError } from './error-orpc'

export function mapEventIterator<TYield, TReturn, TNext, TMap = TYield | TReturn>(
  iterator: AsyncIterator<TYield, TReturn, TNext>,
  maps: {
    value: (value: NoInfer<TYield | TReturn>, done: boolean | undefined) => Promise<TMap>
    error: (error: unknown) => Promise<unknown>
  },
): AsyncGenerator<TMap, TMap, TNext> {
  return (async function* () {
    try {
      while (true) {
        const { done, value } = await iterator.next()

        let mappedValue = await maps.value(value, done) as any

        if (mappedValue !== value) {
          const meta = getEventMeta(value)
          if (meta && isEventMetaContainer(mappedValue)) {
            mappedValue = withEventMeta(mappedValue, meta)
          }
        }

        if (done) {
          return mappedValue
        }

        yield mappedValue
      }
    }
    catch (error) {
      let mappedError = await maps.error(error)

      if (mappedError !== error) {
        const meta = getEventMeta(error)
        if (meta && isEventMetaContainer(mappedError)) {
          mappedError = withEventMeta(mappedError, meta)
        }
      }

      throw mappedError
    }
    finally {
      await iterator.return?.()
    }
  })()
}

const EVENT_ITERATOR_SCHEMA_SYMBOL = Symbol('ORPC_EVENT_ITERATOR_SCHEMA')

export function eventIterator<TYieldIn, TYieldOut, TReturnIn = unknown, TReturnOut = unknown>(
  yields: StandardSchemaV1<TYieldIn, TYieldOut>,
  returns?: StandardSchemaV1<TReturnIn, TReturnOut>,
): StandardSchemaV1<AsyncIteratorObject<TYieldIn, TReturnIn, void>, AsyncIteratorObject<TYieldOut, TReturnOut, void>> {
  return {
    '~standard': {
      [EVENT_ITERATOR_SCHEMA_SYMBOL as any]: { yields, returns } satisfies { yields: Schema, returns: Schema },
      vendor: 'orpc',
      version: 1,
      validate(iterator) {
        if (!isAsyncIteratorObject(iterator)) {
          return { issues: [{ message: 'Expect event source iterator', path: [] }] }
        }

        const mapped = mapEventIterator(iterator, {
          async value(value, done) {
            const schema = done ? returns : yields

            if (!schema) {
              return value
            }

            const result = await schema['~standard'].validate(value)

            if (result.issues) {
              throw new ORPCError('EVENT_ITERATOR_VALIDATION_FAILED', {
                message: 'Event source iterator validation failed',
                cause: new ValidationError({
                  issues: result.issues,
                  message: 'Event source iterator validation failed',
                }),
              })
            }

            return result.value
          },
          error: async error => error,
        })

        return { value: mapped }
      },
    },
  }
}

export function getEventIteratorSchemaDetails(schema: Schema): undefined | { yields: Schema, returns: Schema } {
  if (schema === undefined) {
    return undefined
  }

  return (schema['~standard'] as any)[EVENT_ITERATOR_SCHEMA_SYMBOL]
}
