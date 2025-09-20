import type { Client } from '@orpc/client'
import type { AsyncIteratorClass } from '@orpc/shared'
import type { DurableIteratorObject } from '../object'
import type { ClientDurableIterator, ClientDurableIteratorRpcContext } from './iterator'

it('ClientDurableIterator', () => {
  interface SomeObject extends DurableIteratorObject<{ v: string }> {
    sendMessage: (ws: WebSocket) => Client<object, string, string, 'any-error'>
  }

  type ClientIterator = ClientDurableIterator<SomeObject, 'sendMessage'>

  expectTypeOf<ClientIterator>().toExtend<AsyncIteratorClass<{ v: string }>>()

  expectTypeOf<ClientIterator['sendMessage']>().toEqualTypeOf<
    Client<ClientDurableIteratorRpcContext, string, string, Error>
  >()
})
