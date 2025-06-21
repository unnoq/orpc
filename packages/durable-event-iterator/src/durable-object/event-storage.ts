import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'
import { getEventMeta, withEventMeta } from '@orpc/server'
import { stringifyJSON } from '@orpc/shared'

export interface DurableEventIteratorObjectEventStorageOptions extends StandardRPCJsonSerializerOptions {
  /**
   * The retention period for event in seconds.
   *
   * @default 300 (5 minutes)
   */
  eventRetentionSeconds?: number
}

export class DurableEventIteratorObjectEventStorage<TEventPayload extends object> {
  private readonly serializer: StandardRPCJsonSerializer
  private readonly eventRetentionSeconds: number

  constructor(
    private readonly durableObjectState: DurableObjectState,
    options: DurableEventIteratorObjectEventStorageOptions = {},
  ) {
    this.eventRetentionSeconds = options.eventRetentionSeconds ?? 60 * 5 // 5 minutes
    this.serializer = new StandardRPCJsonSerializer(options)

    this.initSchema()
  }

  private initSchema(): void {
    this.durableObjectState.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS "dei:events" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        time INTEGER NOT NULL
      )
    `)

    this.durableObjectState.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "dei:idx_event_id" ON "dei:events" (id)
    `)

    this.durableObjectState.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "dei:idx_event_time" ON "dei:events" (time)
    `)
  }

  private resetSchema(): void {
    this.durableObjectState.storage.sql.exec(`
      DROP TABLE IF EXISTS "dei:events"
    `)

    this.initSchema()
  }

  private serializeEvent(payload: TEventPayload): string {
    const eventMeta = getEventMeta(payload)
    const [json, meta] = this.serializer.serialize({ payload, meta: eventMeta })
    return stringifyJSON({ json, meta })
  }

  private deserializeEvent(serialized: string): TEventPayload {
    const { json, meta } = JSON.parse(serialized)
    const { payload, meta: eventMeta } = this.serializer.deserialize(json, meta) as {
      payload: TEventPayload
      meta: ReturnType<typeof getEventMeta>
    }
    return eventMeta ? withEventMeta(payload, eventMeta) : payload
  }

  storeEvent(
    payload: TEventPayload,
  ): TEventPayload {
    const serialized = this.serializeEvent(payload)
    const now = Math.floor(Date.now() / 1000)

    const insertEvent = () => {
      this.durableObjectState.storage.sql.exec(`
        DELETE FROM "dei:events" WHERE time < ?1
      `, now - this.eventRetentionSeconds)

      /**
       * Sqlite INTEGER can be out of safe range for JavaScript,
       * so we use TEXT to store the ID.
       */
      const result = this.durableObjectState.storage.sql.exec(`
        INSERT INTO "dei:events" (event, time) VALUES (?1, ?2) 
        RETURNING CAST(id AS TEXT) as id
      `, serialized, now)

      const insertedId = result.one()?.id as string

      return withEventMeta(payload, {
        ...getEventMeta(payload),
        id: insertedId,
      })
    }

    try {
      return insertEvent()
    }
    catch {
      /**
       * In the error case, like full disk, exceeding the max number of rows, etc.,
       * we reset the schema and try to insert again.
       * This can lead to data loss, but it's better than failing the entire operation.
       */
      this.resetSchema()
      return insertEvent()
    }
  }

  getEventsAfter(
    lastEventId: string,
  ): TEventPayload[] {
    const result = this.durableObjectState.storage.sql.exec(`
      SELECT CAST(id AS TEXT) as id, event
      FROM "dei:events"
      WHERE id > ?1
      ORDER BY id ASC
    `, lastEventId)

    return result.toArray().map((row: Record<string, any>) => {
      const event = this.deserializeEvent(row.event)
      return withEventMeta(event, { ...getEventMeta(event), id: row.id })
    })
  }
}
