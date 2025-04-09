import type { ClientContext } from '@orpc/client'
import type { AnyContractRouter } from '@orpc/contract'
import { StandardLink, type StandardLinkClient, type StandardLinkOptions } from '@orpc/client/standard'
import { StandardBracketNotationSerializer } from './bracket-notation'
import { StandardOpenAPIJsonSerializer, type StandardOpenAPIJsonSerializerOptions } from './openapi-json-serializer'
import { StandardOpenapiLinkCodec, type StandardOpenapiLinkCodecOptions } from './openapi-link-codec'
import { StandardOpenAPISerializer } from './openapi-serializer'

export interface StandardOpenAPILinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardOpenapiLinkCodecOptions<T>, StandardOpenAPIJsonSerializerOptions {}

export class StandardOpenAPILink<T extends ClientContext> extends StandardLink<T> {
  constructor(contract: AnyContractRouter, linkClient: StandardLinkClient<T>, options: StandardOpenAPILinkOptions<T>) {
    const jsonSerializer = new StandardOpenAPIJsonSerializer(options)
    const bracketNotationSerializer = new StandardBracketNotationSerializer()
    const serializer = new StandardOpenAPISerializer(jsonSerializer, bracketNotationSerializer)
    const linkCodec = new StandardOpenapiLinkCodec(contract, serializer, options)

    super(linkCodec, linkClient, options)
  }
}
