export type HTTPPath = `/${string}`
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type InputStructure = 'compact' | 'detailed'
export type OutputStructure = 'compact' | 'detailed'

export interface Route {
  method?: HTTPMethod
  path?: HTTPPath
  summary?: string
  description?: string
  deprecated?: boolean
  tags?: readonly string[]

  /**
   * The status code of the response when the procedure is successful.
   *
   * @default 200
   */
  successStatus?: number

  /**
   * The description of the response when the procedure is successful.
   *
   * @default 'OK'
   */
  successDescription?: string

  /**
   * Determines how the input should be structured based on `params`, `query`, `headers`, and `body`.
   *
   * @option 'compact'
   * Combines `params` and either `query` or `body` (depending on the HTTP method) into a single object.
   *
   * @option 'detailed'
   * Keeps each part of the request (`params`, `query`, `headers`, and `body`) as separate fields in the input object.
   *
   * Example:
   * ```ts
   * const input = {
   *   params: { id: 1 },
   *   query: { search: 'hello' },
   *   headers: { 'Content-Type': 'application/json' },
   *   body: { name: 'John' },
   * }
   * ```
   *
   * @default 'compact'
   */
  inputStructure?: InputStructure

  /**
   * Determines how the response should be structured based on the output.
   *
   * @option 'compact'
   * Includes only the body data, encoded directly in the response.
   *
   * @option 'detailed'
   * Separates the output into `headers` and `body` fields.
   * - `headers`: Custom headers to merge with the response headers.
   * - `body`: The response data.
   *
   * Example:
   * ```ts
   * const output = {
   *   headers: { 'x-custom-header': 'value' },
   *   body: { message: 'Hello, world!' },
   * };
   * ```
   *
   * @default 'compact'
   */
  outputStructure?: OutputStructure
}

/**
 * Since `undefined` has a specific meaning (it use default value),
 * we ensure all additional properties in each item of the ErrorMap are explicitly set to `undefined`.
 */
export type StrictRoute<T extends Route> = T & Partial<Record<Exclude<keyof Route, keyof T>, undefined>>

export type MergeRoute<A extends Route, B extends Route> = Omit<A, keyof B> & B

export function mergeRoute<A extends Route, B extends Route>(a: A, b: B): MergeRoute<A, B> {
  return {
    ...a,
    ...b,
  }
}

export type PrefixRoute<TRoute extends Route, TPrefix extends HTTPPath> =
  TRoute['path'] extends HTTPPath ? Omit<TRoute, 'path'> & {
    // I don't know why but we need recheck TPrefix here to make typescript happy on [DecoratedContractProcedure.prefix]
    path: TPrefix extends HTTPPath ? `${TPrefix}${TRoute['path']}` : TRoute['path']
  }
    : TRoute

export function prefixRoute<TRoute extends Route, TPrefix extends HTTPPath>(
  route: TRoute,
  prefix: TPrefix,
): PrefixRoute<TRoute, TPrefix> {
  if (!route.path) {
    return route as any
  }

  return {
    ...route,
    path: `${prefix}${route.path}` as any,
  }
}

export type UnshiftTagRoute<TRoute extends Route, TTags extends readonly string[]> = Omit<TRoute, 'tags'> & {
  tags: TRoute['tags'] extends string[] ? [...TTags, ...TRoute['tags']] : TTags
}

export function unshiftTagRoute<TRoute extends Route, TTags extends readonly string[]>(
  route: TRoute,
  tags: TTags,
): UnshiftTagRoute<TRoute, TTags> {
  return {
    ...route,
    tags: [...tags, ...route.tags ?? []] as any,
  }
}

export type MergePrefix<A extends HTTPPath | undefined, B extends HTTPPath> = A extends HTTPPath ? `${A}${B}` : B

export function mergePrefix<A extends HTTPPath | undefined, B extends HTTPPath>(a: A, b: B): MergePrefix<A, B> {
  return a ? `${a}${b}` : b as any
}

export type MergeTags<A extends readonly string[] | undefined, B extends readonly string[]> = A extends readonly string[] ? [...A, ...B] : B

export function mergeTags<A extends readonly string[] | undefined, B extends readonly string[]>(a: A, b: B): MergeTags<A, B> {
  return a ? [...a, ...b] : b as any
}
