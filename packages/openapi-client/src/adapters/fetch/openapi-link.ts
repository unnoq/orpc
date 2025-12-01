import type { ClientContext } from '@orpc/client'
import type { LinkFetchClientOptions } from '@orpc/client/fetch'
import type { AnyContractRouter } from '@orpc/contract'
import type { StandardOpenAPILinkOptions } from '../standard'
import { LinkFetchClient } from '@orpc/client/fetch'
import { StandardOpenAPILink } from '../standard'

export interface OpenAPILinkOptions<T extends ClientContext>
  extends LinkFetchClientOptions<T>, Omit<StandardOpenAPILinkOptions<T>, 'plugins'> { }

/**
 * The OpenAPI Link for fetch runtime communicates with the server that follow the OpenAPI specification.
 *
 * @see {@link https://orpc.dev/docs/openapi/client/openapi-link OpenAPI Link Docs}
 * @see {@link https://swagger.io/specification/ OpenAPI Specification}
 */
export class OpenAPILink<T extends ClientContext> extends StandardOpenAPILink<T> {
  constructor(contract: AnyContractRouter, options: OpenAPILinkOptions<T>) {
    const linkClient = new LinkFetchClient(options)

    super(contract, linkClient, options)
  }
}
