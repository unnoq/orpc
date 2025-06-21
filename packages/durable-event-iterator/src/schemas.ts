import * as v from 'valibot'

export type DurableEventIteratorJwtPayload = v.InferOutput<typeof DurableEventIteratorJwtPayloadSchema>

export const DurableEventIteratorJwtPayloadSchema = v.pipe(
  v.object({
    chn: v.string(), // Channel name
    att: v.optional(v.any()), // Attachment
    alm: v.pipe(v.optional(v.array(v.string())), v.readonly()), // Allowed methods
    exp: v.optional(v.number()), // Expiration time in seconds
  }),
  v.transform(payload => ({ att: undefined, ...payload })),
)
