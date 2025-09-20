import { getEventMeta, withEventMeta } from '@orpc/server'
import { sleep } from '@orpc/shared'
import { createCloudflareWebsocket, createDurableObjectState } from '../../tests/shared'
import { EventResumeStorage } from './resume-storage'
import { toDurableIteratorWebsocket } from './websocket'

describe('eventStreamStorage', () => {
  it('do nothing by default', () => {
    const ctx = createDurableObjectState()
    const storage = new EventResumeStorage(ctx, {})

    storage.store({ v: 1 }, { targets: [], exclude: [] })

    expect(ctx.storage.sql.exec('SELECT name FROM sqlite_master WHERE type=?', 'table').toArray()).toEqual([])
    expect(storage.get(createCloudflareWebsocket(), '0')).toEqual([])
  })

  it('auto remove expired events on init', async () => {
    const ctx = createDurableObjectState()
    const storage = new EventResumeStorage(ctx, { resumeRetentionSeconds: 1 })
    storage.store({ v: 1 }, { targets: [], exclude: [] })
    expect(ctx.storage.sql.exec('SELECT count(*) as count FROM "orpc:durable-iterator:resume:events"').one().count).toEqual(1)

    await sleep(2000)
    void new EventResumeStorage(ctx, { resumeRetentionSeconds: 1 })
    expect(ctx.storage.sql.exec('SELECT count(*) as count FROM "orpc:durable-iterator:resume:events"').one().count).toEqual(0)
  })

  it('store -> get -> expire', async () => {
    const ctx = createDurableObjectState()
    const storage = new EventResumeStorage(ctx, { resumeRetentionSeconds: 1 })
    const ws = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws['~orpc'].serializeId('ws-id')

    const payload1 = storage.store(withEventMeta({ order: 1 }, { id: 'some-id', retry: 238 }), {})
    expect(payload1).toEqual({ order: 1 })
    expect(getEventMeta(payload1)).toEqual({ id: '1', retry: 238 }) // id is overridden for matching id in sqlite

    const payload2 = storage.store(withEventMeta({ order: 2 }, { comments: ['hi'] }), {})
    expect(payload2).toEqual({ order: 2 })
    expect(getEventMeta(payload2)).toEqual({ id: '2', comments: ['hi'] })

    const payload3 = storage.store({ order: 3 }, {})
    expect(payload3).toEqual({ order: 3 })
    expect(getEventMeta(payload3)).toEqual({ id: '3' })

    const relatives = storage.get(ws, '0')
    expect(relatives).toEqual([payload1, payload2, payload3])
    expect(getEventMeta(relatives[0])).toEqual({ id: '1', retry: 238 })
    expect(getEventMeta(relatives[1])).toEqual({ id: '2', comments: ['hi'] })
    expect(getEventMeta(relatives[2])).toEqual({ id: '3' })

    expect(storage.get(ws, '1')).toEqual([payload2, payload3])
    expect(storage.get(ws, '2')).toEqual([payload3])

    await sleep(2000)
    expect(storage.get(ws, '0')).toEqual([])
    expect(storage.get(ws, '1')).toEqual([])
    expect(storage.get(ws, '2')).toEqual([])
  })

  it('store auto reset data on id overflow', async () => {
    const ctx = createDurableObjectState()
    const storage = new EventResumeStorage(ctx, { resumeRetentionSeconds: 1 })

    // fake reading id limit
    ctx.storage.sql.exec(
      `INSERT INTO "orpc:durable-iterator:resume:events" (id, payload, target_ids, exclusion_ids) VALUES (?, ?, ?, ?)`,
      '9223372036854775807',
      '{}',
      '[]',
      '[]',
    )
    expect(ctx.storage.sql.exec('SELECT count(*) as count FROM "orpc:durable-iterator:resume:events"').one().count).toEqual(1)

    const payload = storage.store({ order: 1 }, {})
    expect(payload).toEqual({ order: 1 })
    expect(getEventMeta(payload)).toEqual({ id: '1' }) // id is reset
    expect(ctx.storage.sql.exec('SELECT count(*) as count FROM "orpc:durable-iterator:resume:events"').one().count).toEqual(1)
  })

  it('get targets, exclude options', async () => {
    const ctx = createDurableObjectState()
    const storage = new EventResumeStorage(ctx, { resumeRetentionSeconds: 1 })

    const ws1 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws1['~orpc'].serializeId('ws-1')
    const ws2 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws2['~orpc'].serializeId('ws-2')
    const ws3 = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws3['~orpc'].serializeId('ws-3')

    const payload1 = storage.store({ order: 1 }, { targets: [ws1] })
    const payload2 = storage.store({ order: 2 }, { exclude: [ws2] })
    const payload3 = storage.store({ order: 3 }, { targets: [ws1, ws2], exclude: [ws2, ws3] })
    const payload4 = storage.store({ order: 4 }, { exclude: [ws1, ws3] })

    expect(storage.get(ws1, '0')).toEqual([payload1, payload2, payload3])
    expect(storage.get(ws2, '0')).toEqual([payload4])
    expect(storage.get(ws3, '0')).toEqual([payload2])
  })

  it('support custom json serializer', async () => {
    class Person {
      constructor(public name: string) {}
    }

    const ctx = createDurableObjectState()
    const storage = new EventResumeStorage(ctx, {
      resumeRetentionSeconds: 1,
      customJsonSerializers: [
        {
          type: 1000,
          condition: v => v instanceof Person,
          serialize: v => ({ name: v.name }),
          deserialize: ({ name }) => new Person(name),
        },
      ],
    })

    const ws = toDurableIteratorWebsocket(createCloudflareWebsocket())
    ws['~orpc'].serializeId('ws-1')

    storage.store(new Person('__name__'), {})
    const payload = storage.get(ws, '0')[0]
    expect(payload).toEqual(new Person('__name__'))
  })
})
