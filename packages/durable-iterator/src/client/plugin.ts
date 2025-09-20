import type { ClientContext, ClientLink } from '@orpc/client'
import type { ClientRetryPluginContext } from '@orpc/client/plugins'
import type { StandardLinkInterceptorOptions, StandardLinkOptions, StandardLinkPlugin } from '@orpc/client/standard'
import type { RPCLinkOptions } from '@orpc/client/websocket'
import type { ContractRouterClient } from '@orpc/contract'
import type { Promisable, Value } from '@orpc/shared'
import type { durableIteratorContract } from '../contract'
import type { DurableIteratorTokenPayload } from '../schemas'
import { createORPCClient } from '@orpc/client'
import { ClientRetryPlugin } from '@orpc/client/plugins'
import { RPCLink } from '@orpc/client/websocket'
import { AsyncIteratorClass, fallback, retry, stringifyJSON, toArray, value } from '@orpc/shared'
import { WebSocket as ReconnectableWebSocket } from 'partysocket'
import { DURABLE_ITERATOR_ID_PARAM, DURABLE_ITERATOR_PLUGIN_HEADER_KEY, DURABLE_ITERATOR_PLUGIN_HEADER_VALUE, DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { DurableIteratorError } from '../error'
import { parseDurableIteratorToken } from '../schemas'
import { createClientDurableIterator } from './iterator'

export interface DurableIteratorLinkPluginContext {
  isDurableIteratorResponse?: boolean
}

export interface DurableIteratorLinkPluginOptions<T extends ClientContext> extends Omit<RPCLinkOptions<object>, 'websocket'> {
  /**
   * The WebSocket URL to connect to the Durable Event Iterator Object.
   */
  url: Value<Promisable<string | URL>, [tokenPayload: DurableIteratorTokenPayload, options: StandardLinkInterceptorOptions<T>]>

  /**
   * Generates a unique, unguessable websocket identifier.
   *
   * This ID is attached to the WebSocket connection so the server can
   * recognize the same client across reconnects. It is called **once per client**
   *
   * @remarks
   * - Use a strong random generator to avoid collisions or predictable IDs.
   *
   * @default (() => `${crypto.randomUUID()}-${crypto.randomUUID()}`)
   */
  createId?: (tokenPayload: DurableIteratorTokenPayload, options: StandardLinkInterceptorOptions<T>) => Promisable<string>

  /**
   * Refresh the token this many seconds before it expires.
   *
   * @remarks
   * - Pick a value larger than the expected token refresh time, network latency, and retry on failure
   *   to ensure a seamless refresh without reconnecting the WebSocket.
   * - 300 seconds (5 minutes) is typically enough; 600 seconds (10 minutes) is safer
   * - Use a infinite value to disable refreshing
   *
   * @default NaN (disabled)
   */
  refreshTokenBeforeExpireInSeconds?: Value<Promisable<number>, [tokenPayload: DurableIteratorTokenPayload, options: StandardLinkInterceptorOptions<T>]>
}

/**
 * @see {@link https://orpc.unnoq.com/docs/integrations/durable-event-iterator Durable Event Iterator Integration}
 */
export class DurableIteratorLinkPlugin<T extends ClientContext> implements StandardLinkPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_DURABLE_ITERATOR_LINK_PLUGIN_CONTEXT')

  order = 2_100_000 // make sure execute before the batch plugin and after client retry plugin

  private readonly url: DurableIteratorLinkPluginOptions<T>['url']
  private readonly createId: Exclude<DurableIteratorLinkPluginOptions<T>['createId'], undefined>
  private readonly refreshTokenBeforeExpireInSeconds: Exclude<DurableIteratorLinkPluginOptions<T>['refreshTokenBeforeExpireInSeconds'], undefined>
  private readonly linkOptions: Omit<RPCLinkOptions<object>, 'websocket'>

  constructor({ url, refreshTokenBeforeExpireInSeconds, ...options }: DurableIteratorLinkPluginOptions<T>) {
    this.url = url
    this.createId = fallback(options.createId, () => `${crypto.randomUUID()}-${crypto.randomUUID()}`)
    this.refreshTokenBeforeExpireInSeconds = fallback(refreshTokenBeforeExpireInSeconds, Number.NaN)
    this.linkOptions = options
  }

  init(options: StandardLinkOptions<T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.push(async (options) => {
      const pluginContext: DurableIteratorLinkPluginContext = {}

      const next = () => options.next({
        ...options,
        context: {
          [this.CONTEXT_SYMBOL]: pluginContext,
          ...options.context,
        },
      })

      const output = await next()

      if (!pluginContext.isDurableIteratorResponse) {
        return output
      }

      /**
       * Estimate a websocket connection take time, and `abort` is not fire if signal already aborted
       * So we should throw if signal already aborted here
       */
      options?.signal?.throwIfAborted()

      let isFinished = false // use this for cleanup logic

      let tokenAndPayload = this.validateToken(output, options.path)
      const id = await this.createId(tokenAndPayload.payload, options)
      const websocket = new ReconnectableWebSocket(async () => {
        const url = new URL(await value(this.url, tokenAndPayload.payload, options))
        url.searchParams.append(DURABLE_ITERATOR_ID_PARAM, id)
        url.searchParams.append(DURABLE_ITERATOR_TOKEN_PARAM, tokenAndPayload.token)
        return url.toString()
      })

      const durableClient: ContractRouterClient<typeof durableIteratorContract, ClientRetryPluginContext>
        = createORPCClient(new RPCLink<ClientRetryPluginContext>({
          ...this.linkOptions,
          websocket,
          plugins: [
            ...toArray(this.linkOptions.plugins),
            new ClientRetryPlugin(),
          ],
        }))

      let refreshTokenBeforeExpireTimeoutId: ReturnType<typeof setTimeout> | undefined
      const refreshTokenBeforeExpire = async () => {
        const beforeSeconds = await value(this.refreshTokenBeforeExpireInSeconds, tokenAndPayload.payload, options)

        // stop refreshing if already finished
        if (isFinished || !Number.isFinite(beforeSeconds)) {
          return
        }

        const nowInSeconds = Math.floor(Date.now() / 1000)

        refreshTokenBeforeExpireTimeoutId = setTimeout(async () => {
          // retry until success or is finished
          await retry({ times: Number.POSITIVE_INFINITY, delay: 2000 }, async (exit) => {
            try {
              const output = await next()
              const newTokenAndPayload = this.validateToken(output, options.path)

              if (newTokenAndPayload.payload.chn !== tokenAndPayload.payload.chn) {
                exit(new DurableIteratorError('Refreshed token must have the same channel with the original token'))
              }
              else if (stringifyJSON(newTokenAndPayload.payload.tags) !== stringifyJSON(tokenAndPayload.payload.tags)) {
                exit(new DurableIteratorError('Refreshed token must have the exact same tags with the original token'))
              }
              else {
                tokenAndPayload = newTokenAndPayload
              }
            }
            catch (err) {
              if (isFinished) {
                exit(err)
              }

              throw err
            }
          })

          await refreshTokenBeforeExpire() // recursively call

          /**
           * Actively set a new token before the current one expires (avoid re-establishing the connection when the token expires)
           *
           * This call can fail, and it is not required for the next
           * `refreshTokenBeforeExpire` cycle. It should therefore be
           * executed as the last step.
           */
          await durableClient.updateToken({ token: tokenAndPayload.token })
        }, (tokenAndPayload.payload.exp - nowInSeconds - beforeSeconds) * 1000)
      }
      refreshTokenBeforeExpire()

      const closeConnection = () => {
        isFinished = true
        clearTimeout(refreshTokenBeforeExpireTimeoutId)
        websocket.close()
      }

      options?.signal?.addEventListener('abort', closeConnection, { once: true })

      const iterator_ = await durableClient.subscribe(undefined, {
        context: {
          retry: Number.POSITIVE_INFINITY,
        },
        lastEventId: options.lastEventId, // we can use user provided lastEventId for initial connection
      })
      const cancelableIterator = new AsyncIteratorClass(
        () => iterator_.next(),
        async () => {
          /**
           * Durable iterator design for long-lived connections
           * so if user trying to abort the iterator, we should close entire connection
           */
          closeConnection()
          /**
           * prevent memory leak in case signal is reused for another purpose
           */
          options.signal?.removeEventListener('abort', closeConnection)
        },
      )

      const link: ClientLink<object> = {
        call(path, input, options) {
          return durableClient.call({
            path: path as [string, ...string[]], // safely cast, server will validate later
            input,
          }, options)
        },
      }

      const durableIterator = createClientDurableIterator(
        cancelableIterator,
        link,
        {
          getToken: () => tokenAndPayload.token,
        },
      )

      return durableIterator
    })

    options.clientInterceptors.push(async (options) => {
      const pluginContext = options.context[this.CONTEXT_SYMBOL] as DurableIteratorLinkPluginContext | undefined

      if (!pluginContext) {
        throw new DurableIteratorError('Plugin context has been corrupted or modified by another plugin or interceptor')
      }

      const response = await options.next()

      pluginContext.isDurableIteratorResponse = response.headers[DURABLE_ITERATOR_PLUGIN_HEADER_KEY] === DURABLE_ITERATOR_PLUGIN_HEADER_VALUE

      return response
    })
  }

  private validateToken(token: unknown, path: readonly string[]): { token: string, payload: DurableIteratorTokenPayload } {
    if (typeof token !== 'string') {
      throw new DurableIteratorError(`Expected valid token for procedure ${path.join('.')}`)
    }

    try {
      return { token, payload: parseDurableIteratorToken(token) }
    }
    catch (error) {
      throw new DurableIteratorError(`Expected valid token for procedure ${path.join('.')}`, { cause: error })
    }
  }
}
