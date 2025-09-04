import type { NestedClient } from '@orpc/client'
import type { AsyncIteratorClass, JsonValue } from '@orpc/shared'

export type TokenAtt = JsonValue | undefined

export interface DurableEventIteratorObjectDef<
  TEventPayload extends object,
  TTokenAtt extends TokenAtt,
> {
  eventPayload?: { type: TEventPayload }
  tokenAtt?: { type: TTokenAtt }
}

export interface DurableEventIteratorObject<
  TEventPayload extends object,
  TTokenAtt extends TokenAtt,
> {
  '~orpc'?: DurableEventIteratorObjectDef<TEventPayload, TTokenAtt>
}

export type InferDurableEventIteratorObjectRPC<
  T extends DurableEventIteratorObject<any, any>,
> = Exclude<{
  [K in keyof T]: T[K] extends ((...args: any[]) => NestedClient<object>)
    ? K
    : never
}[keyof T], keyof AsyncIteratorClass<any>> & string
