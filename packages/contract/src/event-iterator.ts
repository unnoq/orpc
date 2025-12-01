import type { AsyncIteratorClass } from '@orpc/shared'
import type { AnySchema, Schema } from './schema'
import { mapEventIterator, ORPCError } from '@orpc/client'
import { isAsyncIteratorObject } from '@orpc/shared'
import { ValidationError } from './error'

const EVENT_ITERATOR_DETAILS_SYMBOL = Symbol('ORPC_EVENT_ITERATOR_DETAILS')

export interface EventIteratorSchemaDetails {
  yields: AnySchema
  returns?: AnySchema
}

/**
 * Define schema for an event iterator.
 *
 * @see {@link https://orpc.dev/docs/event-iterator#validate-event-iterator Validate Event Iterator Docs}
 */
export function eventIterator<TYieldIn, TYieldOut, TReturnIn = unknown, TReturnOut = unknown>(
  yields: Schema<TYieldIn, TYieldOut>,
  returns?: Schema<TReturnIn, TReturnOut>,
): Schema<AsyncIteratorObject<TYieldIn, TReturnIn, void>, AsyncIteratorClass<TYieldOut, TReturnOut, void>> {
  return {
    '~standard': {
      [EVENT_ITERATOR_DETAILS_SYMBOL as any]: { yields, returns } satisfies EventIteratorSchemaDetails,
      vendor: 'orpc',
      version: 1,
      validate(iterator) {
        if (!isAsyncIteratorObject(iterator)) {
          return { issues: [{ message: 'Expect event iterator', path: [] }] }
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
                message: 'Event iterator validation failed',
                cause: new ValidationError({
                  issues: result.issues,
                  message: 'Event iterator validation failed',
                  data: value,
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

export function getEventIteratorSchemaDetails(schema: AnySchema | undefined): undefined | EventIteratorSchemaDetails {
  if (schema === undefined) {
    return undefined
  }

  return (schema['~standard'] as any)[EVENT_ITERATOR_DETAILS_SYMBOL]
}
