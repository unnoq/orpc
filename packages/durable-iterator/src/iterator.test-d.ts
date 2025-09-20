import type { Client } from '@orpc/client'
import type { ClientDurableIterator } from './client'
import type { DurableIteratorObject } from './object'
import { DurableIterator } from './iterator'

describe('DurableIteratorOptions', () => {
  it('require provide valid rpc methods', () => {
    interface TestObject extends DurableIteratorObject<{ v: string }> {
      rpc: () => Client<object, string, string, Error>
      invalid: 'invalid'
    }

    const iterator1 = new DurableIterator<TestObject>('some-room', {
      signingKey: 'signing-key',
    }).rpc('rpc')

    const iterator2 = new DurableIterator<TestObject>('some-room', {
      signingKey: 'signing-key',
    })
      // @ts-expect-error - Should error on invalid rpc
      .rpc('invalid')
  })

  it('resolve correct client durable event iterator type', async () => {
    interface TestObject extends DurableIteratorObject<{ v: string }> {
      rpc: () => Client<object, string, string, Error>
    }

    const iterator1 = await new DurableIterator<TestObject>('some-room', {
      signingKey: 'singing-key',
    })

    expectTypeOf(iterator1).toEqualTypeOf<ClientDurableIterator<TestObject, never>>()

    const iterator2 = await new DurableIterator<TestObject>('some-room', {
      signingKey: 'singing-key',
    }).rpc('rpc')

    expectTypeOf(iterator2).toEqualTypeOf<ClientDurableIterator<TestObject, 'rpc'>>()
  })
})
