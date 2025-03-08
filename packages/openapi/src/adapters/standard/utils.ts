import type { HTTPPath } from '@orpc/contract'
import { standardizeHTTPPath } from '../../openapi-utils'

/**
 * {@link https://github.com/unjs/rou3}
 *
 * @internal
 */
export function toRou3Pattern(path: HTTPPath): string {
  return standardizeHTTPPath(path).replace(/\{\+([^}]+)\}/g, '**:$1').replace(/\{([^}]+)\}/g, ':$1')
}

/**
 * @internal
 */
export function decodeParams(params: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)]))
}
