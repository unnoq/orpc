import type { AnyProcedureContract } from '@orpc/contract'
import type { Value } from '@orpc/shared'
import type { StandardMethod } from '@standardserver/core'
import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'
import type { WalkProcedureContractsLazyResult } from '../../router-utils'
import { normalizeHttpPath, pathToHttpPath, value } from '@orpc/shared'
import { unlazy } from '../../lazy'
import { Procedure } from '../../procedure'
import { createContractProcedure } from '../../procedure-utils'
import { getRouter, walkProcedureContractsSync } from '../../router-utils'

export interface RPCMatcherOptions {
  /**
   * Filter which procedures are exposed for matching. Return `false` to exclude.
   *
   * @default true
   */
  filter?: Value<boolean, [procedure: AnyProcedureContract | AnyProcedure, path: string[]]>
}

interface TreeEntry {
  path: string[]
  contract: AnyProcedureContract
  procedure?: AnyProcedure | undefined
}

interface PendingLazyRouter extends WalkProcedureContractsLazyResult {
  /** in-flight load, shared so concurrent matches never load or re-index the same router twice */
  loading?: Promise<void> | undefined
}

export class RPCMatcher {
  private readonly filter: Exclude<RPCMatcherOptions['filter'], undefined>
  private readonly rootRouter: AnyRouter

  private readonly tree: Map<`/${string}`, TreeEntry> = new Map()
  private readonly pendingLazyRouters: Map<string, PendingLazyRouter> = new Map()

  constructor(router: AnyRouter, options: RPCMatcherOptions = {}) {
    this.filter = options.filter ?? true
    this.rootRouter = router
    this.index(router)
  }

  private index(router: AnyRouter, path: string[] = []): void {
    const lazyResults = walkProcedureContractsSync(router, (procedure, procedurePath) => {
      if (!value(this.filter, procedure, procedurePath)) {
        return
      }

      this.tree.set(pathToHttpPath(procedurePath), {
        path: procedurePath,
        contract: procedure,
        // contract-first entries have no implementation yet, resolveProcedure fills it in on demand
        procedure: procedure instanceof Procedure ? procedure : undefined,
      })
    }, path)

    for (const result of lazyResults) {
      this.pendingLazyRouters.set(pathToHttpPath(result.path), result)
    }
  }

  async match(_method: StandardMethod, pathname: `/${string}`, prefix: `/${string}` | undefined): Promise<{ path: string[], procedure: AnyProcedure } | undefined> {
    if (pathname.length > 1 && pathname.endsWith('/')) {
      // Remove trailing slash for matching
      pathname = pathname.slice(0, -1) as `/${string}`
    }

    if (prefix) {
      if (!pathname.startsWith(prefix)) {
        return undefined
      }

      const charAfterPrefix = pathname[prefix.length]

      if (charAfterPrefix === '/') {
        pathname = pathname.slice(prefix.length) as `/${string}`
      }
      else if (charAfterPrefix === undefined) {
        pathname = '/'
      }
      else if (prefix[prefix.length - 1] === '/') {
        pathname = pathname.slice(prefix.length - 1) as `/${string}`
      }
      else {
        return undefined
      }
    }

    const loading = this.resolvePendingLazyRouters(pathname)
    if (loading !== undefined) {
      await loading
    }

    let entry = this.tree.get(pathname)

    if (entry === undefined && pathname.includes('%')) {
      // Retry with a normalized path: users may percent-encode characters that
      // we store unencoded (e.g. "a%62c" vs "abc"), so normalization lets us
      // handle those requests without storing duplicate entries.

      const normalizedPathname = normalizeHttpPath(pathname)

      const normalizedLoading = this.resolvePendingLazyRouters(normalizedPathname)
      if (normalizedLoading !== undefined) {
        await normalizedLoading
      }

      entry = this.tree.get(normalizedPathname)
    }

    if (entry === undefined) {
      return undefined
    }

    return {
      path: entry.path,
      procedure: entry.procedure ?? await this.resolveProcedure(entry),
    }
  }

  private resolvePendingLazyRouters(pathname: `/${string}`): Promise<void> | void {
    if (this.pendingLazyRouters.size === 0) {
      return
    }

    let slashIndex = 0

    while (slashIndex !== -1) {
      const nextSlashIndex = pathname.indexOf('/', slashIndex + 1)
      const httpPathPrefix = nextSlashIndex === -1 ? pathname : pathname.slice(0, nextSlashIndex)

      if (this.pendingLazyRouters.has(httpPathPrefix)) {
        return this.loadPendingLazyRouters(pathname, slashIndex)
      }

      slashIndex = nextSlashIndex
    }
  }

  private async loadPendingLazyRouters(pathname: `/${string}`, slashIndex: number): Promise<void> {
    while (slashIndex !== -1) {
      const nextSlashIndex = pathname.indexOf('/', slashIndex + 1)
      const httpPathPrefix = nextSlashIndex === -1 ? pathname : pathname.slice(0, nextSlashIndex)

      const pending = this.pendingLazyRouters.get(httpPathPrefix)

      if (pending !== undefined) {
        await this.loadPendingLazyRouter(httpPathPrefix, pending)
      }

      slashIndex = nextSlashIndex
    }
  }

  private loadPendingLazyRouter(httpPathPrefix: string, pending: PendingLazyRouter): Promise<void> {
    if (pending.loading === undefined) {
      const loading = this.indexPendingLazyRouter(httpPathPrefix, pending)

      pending.loading = loading

      // Cleared from a rejection handler rather than a `catch` inside the loader: `unlazy` can
      // throw synchronously, and a `catch` would then run before `loading` is even assigned,
      // parking an already rejected promise on the entry and blocking every retry.
      loading.catch(() => {
        pending.loading = undefined
      })
    }

    return pending.loading
  }

  private async indexPendingLazyRouter(httpPathPrefix: string, pending: PendingLazyRouter): Promise<void> {
    const { default: router } = await unlazy(pending.router)

    this.index(router, pending.path)

    // removed only once indexed, so a concurrent match never observes this router as
    // neither pending nor indexed
    this.pendingLazyRouters.delete(httpPathPrefix)
  }

  private async resolveProcedure(entry: TreeEntry): Promise<AnyProcedure> {
    const { default: maybeProcedure } = await unlazy(getRouter(this.rootRouter, entry.path))

    if (!(maybeProcedure instanceof Procedure)) {
      throw new TypeError(
        `[Contract-First] Missing or invalid implementation for procedure at path: "${entry.path.join('.')}". `
        + `Ensure the procedure is correctly implemented and matches its contract.`,
      )
    }

    entry.procedure = createContractProcedure(maybeProcedure, entry.contract)

    return entry.procedure
  }
}
