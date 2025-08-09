/**
 * Error thrown when an operation is aborted.
 * Uses the standardized 'AbortError' name for consistency with JavaScript APIs.
 */
export class AbortError extends Error {
  constructor(...rest: ConstructorParameters<typeof Error>) {
    super(...rest)
    this.name = 'AbortError'
  }
}
