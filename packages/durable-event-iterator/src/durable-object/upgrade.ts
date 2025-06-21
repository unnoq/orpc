import type { Interceptor } from '@orpc/shared'
import type { DurableEventIteratorObject } from '.'
import type { DurableEventIteratorJwtPayload } from '../schemas'
import { intercept, stringifyJSON, toArray } from '@orpc/shared'
import { jwtVerify } from 'jose'
import * as v from 'valibot'
import { DURABLE_EVENT_ITERATOR_JWT_PARAM } from '../consts'
import { DurableEventIteratorJwtPayloadSchema } from '../schemas'
import { DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY } from './consts'

export interface UpgradeDurableEventIteratorRequestOptions {
  namespace: DurableObjectNamespace<any>
  signingKey: string
  interceptors?: Interceptor<{ payload: DurableEventIteratorJwtPayload }, Promise<Response>>[]
}

/**
 * Verifies and upgrades a durable event iterator request.
 */
export async function upgradeDurableEventIteratorRequest(
  request: Request,
  options: UpgradeDurableEventIteratorRequestOptions,
): Promise<Response> {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', {
      status: 426,
    })
  }

  const url = new URL(request.url)
  const jwt = url.searchParams.getAll(DURABLE_EVENT_ITERATOR_JWT_PARAM).at(-1)

  if (!jwt) {
    return new Response('JWT is required', {
      status: 401,
    })
  }

  let payload

  try {
    const result = await jwtVerify(jwt, new TextEncoder().encode(options.signingKey))
    payload = v.parse(DurableEventIteratorJwtPayloadSchema, result.payload)
  }
  catch {
    return new Response('Invalid JWT', {
      status: 401,
    })
  }

  return intercept(
    toArray(options.interceptors),
    { payload },
    async ({ payload }) => {
      const namespace = options.namespace as DurableObjectNamespace<DurableEventIteratorObject<any, any, any>>
      const id = namespace.idFromName(payload.chn)
      const stub = namespace.get(id)

      const upgradeUrl = new URL(url.origin + url.pathname)

      upgradeUrl.searchParams.set(DURABLE_EVENT_ITERATOR_JWT_PAYLOAD_KEY, stringifyJSON(payload))

      return stub.fetch(upgradeUrl, request)
    },
  )
}
