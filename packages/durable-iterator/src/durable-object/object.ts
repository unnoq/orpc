import type { DurableIteratorObject as IDurableIteratorObject } from '../object'
import type { DurableIteratorObjectHandlerOptions, PublishEventOptions } from './handler'
import type { DurableIteratorObjectState } from './object-state'
import { DurableObject } from 'cloudflare:workers'
import { DurableIteratorError } from '../error'
import { DurableIteratorObjectHandler } from './handler'

export class DurableIteratorObject<T extends object, TEnv = unknown> extends DurableObject<TEnv> implements IDurableIteratorObject<T> {
  '~orpc': DurableIteratorObjectHandler<T>

  /**
   * Proxied, ensure you don't accidentally change internal state, and auto close if expired websockets before .send is called
   */
  protected override ctx: DurableIteratorObjectState

  constructor(
    ctx: DurableObjectState,
    env: TEnv,
    options: DurableIteratorObjectHandlerOptions,
  ) {
    /**
     * By default, Durable Object constructors only receive `ctx` and `env`.
     * To access the 3rd `options` argument, it must be explicitly passed in.
     */
    if (!options) {
      throw new DurableIteratorError(`
        Missing options (3rd argument) for DurableIteratorObject.
        When extending DurableIteratorObject, you must define your own constructor
        and call super(ctx, env, options).
      `)
    }

    super(ctx, env)
    this['~orpc'] = new DurableIteratorObjectHandler(ctx, this, options)
    this.ctx = this['~orpc'].ctx
  }

  /**
   * Publish an event to clients
   */
  publishEvent(payload: T, options: PublishEventOptions = {}): void {
    return this['~orpc'].publishEvent(payload, options)
  }

  /**
   * Upgrades websocket connection
   *
   * @info You can safety intercept non-upgrade requests
   * @warning No verification is done here, you should verify the token payload before calling this method.
   */
  override fetch(request: Request): Promise<Response> {
    return this['~orpc'].fetch(request)
  }

  /**
   * Handle WebSocket messages
   *
   * @warning Use `toDurableIteratorWebsocket` to proxy the WebSocket when interacting
   *          to avoid accidentally modifying internal state, and auto close if expired before .send is called
   */
  override webSocketMessage(websocket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    return this['~orpc'].webSocketMessage(websocket, message)
  }

  /**
   * Handle WebSocket close event
   *
   * @warning Use `toDurableIteratorWebsocket` to proxy the WebSocket when interacting
   *          to avoid accidentally modifying internal state, and auto close if expired before .send is called
   */
  override webSocketClose(websocket: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
    return this['~orpc'].webSocketClose(websocket, code, reason, wasClean)
  }
}
