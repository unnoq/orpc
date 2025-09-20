import type { ClientLink } from '@orpc/client'
import type { ClientDurableIterator } from './client'
import type { DurableIteratorObject, InferDurableIteratorObjectRPC } from './object'
import { AsyncIteratorClass } from '@orpc/shared'
import { createClientDurableIterator } from './client'
import { DurableIteratorError } from './error'
import { signDurableIteratorToken } from './schemas'

export interface DurableIteratorOptions<
  T extends DurableIteratorObject<any>,
  RPC extends InferDurableIteratorObjectRPC<T>,
> {
  /**
   * The  signing key used to sign the token
   */
  signingKey: string

  /**
   * Time to live for the token in seconds.
   * After expiration, the token will no longer be valid.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  tokenTTLSeconds?: number

  /**
   * Tags to attach to the token.
   */
  tags?: readonly string[]

  /**
   * Token's attachment
   */
  att?: unknown

  /**
   * The methods that are allowed to be called remotely.
   *
   * @warning Please use .rpc method to set this field in case ts complains about value you pass
   *
   * @default []
   */
  rpc?: readonly RPC[]
}

export class DurableIterator<
  T extends DurableIteratorObject<any>,
  RPC extends InferDurableIteratorObjectRPC<T> = never,
> implements PromiseLike<ClientDurableIterator<T, RPC>> {
  constructor(
    private readonly chn: string,
    private readonly options: DurableIteratorOptions<T, RPC>,
  ) {
  }

  /**
   * List of methods that are allowed to be called remotely.
   */
  rpc<U extends InferDurableIteratorObjectRPC<T>>(...rpc: U[]): Omit<DurableIterator<T, U>, 'rpc'> {
    return new DurableIterator<T, U>(this.chn, {
      ...this.options,
      rpc,
    })
  }

  then<TResult1 = ClientDurableIterator<T, RPC>, TResult2 = never>(
    onfulfilled?: ((value: ClientDurableIterator<T, RPC>) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return (async () => {
      const tokenTTLSeconds = this.options.tokenTTLSeconds ?? 60 * 60 * 24 // 24 hours

      const nowInSeconds = Math.floor(Date.now() / 1000)

      const token = await signDurableIteratorToken(this.options.signingKey, {
        chn: this.chn,
        tags: this.options.tags,
        att: this.options.att,
        rpc: this.options.rpc,
        iat: nowInSeconds,
        exp: nowInSeconds + tokenTTLSeconds,
      })

      const iterator = new AsyncIteratorClass<any>(
        () => Promise.reject(new DurableIteratorError('Cannot be iterated directly.')),
        () => Promise.reject(new DurableIteratorError('Cannot be cleaned up directly.')),
      )

      const link: ClientLink<object> = {
        call() {
          throw new DurableIteratorError('Cannot call methods directly.')
        },
      }

      const durableIterator = createClientDurableIterator(iterator, link, {
        getToken: () => token,
      })

      return durableIterator as ClientDurableIterator<T, RPC>
    })().then(onfulfilled, onrejected)
  }
}
