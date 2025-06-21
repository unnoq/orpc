import type { ClientLink } from '@orpc/client'
import type { ClientDurableEventIterator } from './client'
import type { DurableEventIteratorObject } from './object'
import type { DurableEventIteratorJwtPayload } from './schemas'
import { AsyncIteratorClass } from '@orpc/shared'
import { SignJWT } from 'jose'
import { createClientDurableEventIterator } from './client'

export interface ServerDurableEventIteratorOptions<TJwtAttachment> {
  /**
   * Signing key for the JWT.
   */
  signingKey: string

  /**
   * Time to live for the JWT in seconds.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  tokenLifetime?: number

  /**
   * attachment for the JWT.
   */
  attachment: TJwtAttachment

  /**
   * The methods allowed to be remote called.
   */
  allowMethods?: readonly string[]
}

export class ServerDurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  TAllowMethods extends string,
> implements PromiseLike<ClientDurableEventIterator<T, TAllowMethods>> {
  readonly #channel: string
  readonly #signingKey: string
  readonly #tokenLifetime: number
  readonly #attachment: T extends DurableEventIteratorObject<any, infer U> ? U : never
  readonly #allowMethods: readonly string[] | undefined

  constructor(
    channel: string,
    options: ServerDurableEventIteratorOptions<T extends DurableEventIteratorObject<any, infer U> ? U : never>,
  ) {
    this.#channel = channel
    this.#signingKey = options.signingKey
    this.#tokenLifetime = options.tokenLifetime ?? 60 * 60 * 24 // 24 hours
    this.#attachment = options.attachment
    this.#allowMethods = options.allowMethods
  }

  allow<U extends keyof T & string>(methods: readonly U[]): Omit<ServerDurableEventIterator<T, U>, 'allow'> {
    return new ServerDurableEventIterator(this.#channel, {
      attachment: this.#attachment,
      signingKey: this.#signingKey,
      tokenLifetime: this.#tokenLifetime,
      allowMethods: methods,
    })
  }

  then<TResult1 = ClientDurableEventIterator<T, TAllowMethods>, TResult2 = never>(onfulfilled?: ((value: ClientDurableEventIterator<T, TAllowMethods>) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    const payload: DurableEventIteratorJwtPayload = {
      chn: this.#channel,
      alm: this.#allowMethods,
      att: this.#attachment,
    }

    return (async () => {
      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(new Date(Date.now() + this.#tokenLifetime * 1000))
        .sign(new TextEncoder().encode(this.#signingKey))

      const iterator = new AsyncIteratorClass<any>(
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be iterated directly.')),
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be cleaned up directly.')),
      )

      const link: ClientLink<object> = {
        call() {
          throw new Error('[DurableEventIteratorServer] cannot call methods directly.')
        },
      }

      const durableIterator = createClientDurableEventIterator(iterator, link, {
        jwt,
      })

      return durableIterator as ClientDurableEventIterator<T, TAllowMethods>
    })().then(onfulfilled, onrejected)
  }
}
