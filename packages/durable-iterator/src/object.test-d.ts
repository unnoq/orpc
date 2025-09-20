import type { Client } from '@orpc/client'
import type { DurableIteratorObject, InferDurableIteratorObjectRPC } from './object'

it('InferDurableIteratorObjectRPC', () => {
  interface TestObject extends DurableIteratorObject<any> {
    singleClient: (ws: WebSocket) => Client<object, { message: string }, void, Error>
    nestedClient: (ws: WebSocket) => { a: Client<object, undefined, void, Error>, b: Client<object, undefined, void, Error> }

    // invalid cases
    requiredContext: (ws: WebSocket) => Client<{ a: string }, { message: string }, void, Error>
    next: (ws: WebSocket) => Client<object, { message: string }, void, Error>
    notAFunction: Client<{ a: string }, { message: string }, void, Error>
  }

  expectTypeOf<InferDurableIteratorObjectRPC<TestObject>>().toEqualTypeOf<
    'singleClient' | 'nestedClient'
  >()
})
