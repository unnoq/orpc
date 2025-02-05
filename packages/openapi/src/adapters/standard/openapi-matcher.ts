import type { StandardMatcher, StandardMatchResult } from '@orpc/server/standard'
import { type AnyContractProcedure, fallbackContractConfig, type HTTPMethod, type HTTPPath } from '@orpc/contract'
import { type AnyProcedure, type AnyRouter, convertPathToHttpPath, createContractedProcedure, eachContractProcedure, type EachContractProcedureLaziedOptions, getRouterChild, isProcedure, unlazy } from '@orpc/server'
import { addRoute, createRouter, findRoute } from 'rou3'

export interface OpenAPIMatcherOptions {
  /**
   * Fallback method for procedure that does not have a method defined in the contract.
   * If you set `undefined`, we will ignore any procedure that does not have a method defined in the contract.
   *
   * @default 'POST'
   */
  fallbackMethod?: HTTPMethod | undefined
}

export class OpenAPIMatcher implements StandardMatcher {
  private readonly tree = createRouter<{
    path: string[]
    contract: AnyContractProcedure
    procedure: AnyProcedure | undefined
    router: AnyRouter
  }>()

  private readonly fallbackMethod: HTTPMethod | undefined

  constructor(
    options?: OpenAPIMatcherOptions,
  ) {
    this.fallbackMethod = options && 'fallbackMethod' in options ? options.fallbackMethod : fallbackContractConfig('defaultMethod', undefined)
  }

  private readonly pendingRouters: (EachContractProcedureLaziedOptions & { httpPath: HTTPPath }) [] = []

  init(router: AnyRouter, path: string[] = []): void {
    const laziedOptions = eachContractProcedure({
      router,
      path,
    }, ({ path, contract }) => {
      if (!contract['~orpc'].route.method && !this.fallbackMethod) {
        return
      }

      const method = contract['~orpc'].route.method ?? this.fallbackMethod
      const httpPath = convertPathToHttpPath(path)

      if (isProcedure(contract)) {
        addRoute(this.tree, method, httpPath, {
          path,
          contract,
          procedure: contract, // this mean dev not used contract-first so we can used contract as procedure directly
          router,
        })
      }
      else {
        addRoute(this.tree, method, httpPath, {
          path,
          contract,
          procedure: undefined,
          router,
        })
      }
    })

    this.pendingRouters.push(...laziedOptions.map(option => ({
      ...option,
      httpPath: convertPathToHttpPath(option.path),
    })))
  }

  async match(method: string, pathname: HTTPPath): Promise<StandardMatchResult> {
    for (const pendingRouter of this.pendingRouters) {
      if (pathname.startsWith(pendingRouter.httpPath)) {
        const { default: router } = await unlazy(pendingRouter.lazied)
        this.init(router, pendingRouter.path)
      }
    }

    const match = findRoute(this.tree, method, pathname)

    if (!match) {
      return undefined
    }

    if (!match.data.procedure) {
      const { default: maybeProcedure } = await unlazy(getRouterChild(match.data.router, ...match.data.path))

      if (!isProcedure(maybeProcedure)) {
        throw new Error(`
          [Contract-First] Missing or invalid implementation for procedure at path: ${convertPathToHttpPath(match.data.path)}.
          Ensure that the procedure is correctly defined and matches the expected contract.
        `)
      }

      match.data.procedure = createContractedProcedure(match.data.contract, maybeProcedure)
    }

    return {
      path: match.data.path,
      procedure: match.data.procedure,
      params: match.params,
    }
  }
}
