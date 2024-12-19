import type { Promisable } from 'type-fest'

export type Value<T> = T | (() => Promisable<T>)

export function value<T>(value: Value<T>): Promise<T> {
  if (typeof value === 'function') {
    return (value as any)()
  }

  return value as any
}
