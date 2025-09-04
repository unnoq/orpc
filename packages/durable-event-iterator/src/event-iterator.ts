import type { ClientLink } from '@orpc/client'
import type { MaybeOptionalOptions } from '@orpc/shared'
import type { ClientDurableEventIterator } from './client'
import type { DurableEventIteratorObject, InferDurableEventIteratorObjectRPC } from './object'
import { AsyncIteratorClass, resolveMaybeOptionalOptions } from '@orpc/shared'
import { createClientDurableEventIterator } from './client'
import { signToken } from './schemas'

export type DurableEventIteratorOptions<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends InferDurableEventIteratorObjectRPC<T>,
> = {
  /**
   * Unique identifier for the client connection.
   * Used to distinguish between different client instances.
   *
   * @default crypto.randomUUID()
   */
  id?: string

  /**
   * Time to live for the token in seconds.
   * After expiration, the token will no longer be valid.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  tokenTTLSeconds?: number

  /**
   * The methods that are allowed to be called remotely.
   *
   * @warning Please use .rpc method to set this field in case ts complains about value you pass
   *
   * @default []
   */
  rpc?: readonly RPC[]
} & (
    T extends DurableEventIteratorObject<any, infer U>
      ? undefined extends U ? {
        /**
         * Token's attachment
         */
        att?: U
      } : {
        /**
         * Token's attachment
         */
        att: U
      }
      : never
)

export class DurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends InferDurableEventIteratorObjectRPC<T> = never,
> implements PromiseLike<ClientDurableEventIterator<T, RPC>> {
  private readonly options: DurableEventIteratorOptions<T, RPC>

  /**
   * @param chn - The channel name.
   * @param signingKey - The signing key for the token.
   * @param rest - options.
   */
  constructor(
    private readonly chn: string,
    private readonly signingKey: string,
    ...rest: MaybeOptionalOptions<DurableEventIteratorOptions<T, RPC>>
  ) {
    this.options = resolveMaybeOptionalOptions(rest)
  }

  /**
   * List of methods that are allowed to be called remotely.
   */
  rpc<U extends InferDurableEventIteratorObjectRPC<T>>(...rpc: U[]): Omit<DurableEventIterator<T, U>, 'rpc'> {
    return new DurableEventIterator<T, U>(this.chn, this.signingKey, {
      ...this.options,
      rpc,
    })
  }

  then<TResult1 = ClientDurableEventIterator<T, RPC>, TResult2 = never>(
    onfulfilled?: ((value: ClientDurableEventIterator<T, RPC>) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return (async () => {
      const tokenTTLSeconds = this.options.tokenTTLSeconds ?? 60 * 60 * 24 // 24 hours

      const nowInSeconds = Math.floor(Date.now() / 1000)

      const token = await signToken(this.signingKey, {
        id: this.options.id ?? crypto.randomUUID(),
        chn: this.chn,
        att: this.options.att,
        rpc: this.options.rpc,
        iat: nowInSeconds,
        exp: nowInSeconds + tokenTTLSeconds,
      })

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
        token,
      })

      return durableIterator as ClientDurableEventIterator<T, RPC>
    })().then(onfulfilled, onrejected)
  }
}
