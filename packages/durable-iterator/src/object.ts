import type { NestedClient } from '@orpc/client'
import type { AsyncIteratorClass } from '@orpc/shared'

export interface DurableIteratorObjectDef<T extends object> {
  '~eventPayloadType'?: { type: T }
}

export interface DurableIteratorObject<T extends object> {
  '~orpc'?: DurableIteratorObjectDef<T>
}

export type InferDurableIteratorObjectRPC<
  T extends DurableIteratorObject<any>,
> = Exclude<{
  [K in keyof T]: T[K] extends ((...args: any[]) => NestedClient<object>)
    ? K
    : never
}[keyof T], keyof AsyncIteratorClass<any>> & string
