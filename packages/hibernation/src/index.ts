export * from './encode-event'
export * from './handler-plugin'
export {
  /**
   * @deprecated Use `HibernationHandlerPlugin` instead.
   */
  HibernationHandlerPlugin as HibernationPlugin,
} from './handler-plugin'
export { HibernationAsyncIteratorClass } from '@standardserver/peer'
export {
  /**
   * @deprecated Use `HibernationAsyncIteratorClass` instead.
   */
  HibernationAsyncIteratorClass as HibernationEventIterator,
} from '@standardserver/peer'
export type { HibernationAsyncIteratorClassCallback } from '@standardserver/peer'
