import type { AsyncIteratorClass } from '@orpc/shared'
import { oc, type } from '@orpc/contract'
import * as v from 'valibot'

export const durableEventIteratorContract = {
  subscribe: oc.output(type<AsyncIteratorClass<any>>()),
  call: oc.input(
    v.object({
      path: v.tupleWithRest([v.string()], v.string()),
      input: v.unknown(),
    }),
  ),
}
