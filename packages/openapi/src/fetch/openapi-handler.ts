import type { ANY_PROCEDURE, Context, Router, WithSignal } from '@orpc/server'
import type { ConditionalFetchHandler, FetchOptions } from '@orpc/server/fetch'
import type { Params } from 'hono/router'
import type { PublicInputStructureCompact } from './input-structure-compact'
import { createProcedureClient, ORPCError } from '@orpc/server'
import { executeWithHooks, type Hooks, ORPC_HANDLER_HEADER, trim } from '@orpc/shared'
import { JSONSerializer, type PublicJSONSerializer } from '../json-serializer'
import { InputStructureCompact } from './input-structure-compact'
import { InputStructureDetailed, type PublicInputStructureDetailed } from './input-structure-detailed'
import { OpenAPIPayloadCodec, type PublicOpenAPIPayloadCodec } from './openapi-payload-codec'
import { type Hono, OpenAPIProcedureMatcher, type PublicOpenAPIProcedureMatcher } from './openapi-procedure-matcher'
import { CompositeSchemaCoercer, type SchemaCoercer } from './schema-coercer'

export type OpenAPIHandlerOptions<T extends Context> =
  & Hooks<Request, Response, T, WithSignal>
  & {
    jsonSerializer?: PublicJSONSerializer
    procedureMatcher?: PublicOpenAPIProcedureMatcher
    payloadCodec?: PublicOpenAPIPayloadCodec
    inputBuilderSimple?: PublicInputStructureCompact
    inputBuilderFull?: PublicInputStructureDetailed
    schemaCoercers?: SchemaCoercer[]
  }

export class OpenAPIHandler<T extends Context> implements ConditionalFetchHandler<T> {
  private readonly procedureMatcher: PublicOpenAPIProcedureMatcher
  private readonly payloadCodec: PublicOpenAPIPayloadCodec
  private readonly inputStructureCompact: PublicInputStructureCompact
  private readonly inputStructureDetailed: PublicInputStructureDetailed
  private readonly compositeSchemaCoercer: SchemaCoercer

  constructor(
    hono: Hono,
    router: Router<T, any>,
    private readonly options?: NoInfer<OpenAPIHandlerOptions<T>>,
  ) {
    const jsonSerializer = options?.jsonSerializer ?? new JSONSerializer()

    this.procedureMatcher = options?.procedureMatcher ?? new OpenAPIProcedureMatcher(hono, router)
    this.payloadCodec = options?.payloadCodec ?? new OpenAPIPayloadCodec(jsonSerializer)
    this.inputStructureCompact = options?.inputBuilderSimple ?? new InputStructureCompact()
    this.inputStructureDetailed = options?.inputBuilderFull ?? new InputStructureDetailed()
    this.compositeSchemaCoercer = new CompositeSchemaCoercer(options?.schemaCoercers ?? [])
  }

  condition(request: Request): boolean {
    return request.headers.get(ORPC_HANDLER_HEADER) === null
  }

  async fetch(
    request: Request,
    ...[options]: [options: FetchOptions<T>] | (undefined extends T ? [] : never)
  ): Promise<Response> {
    const context = options?.context as T
    const headers = request.headers
    const accept = headers.get('Accept') || undefined

    const execute = async () => {
      const url = new URL(request.url)
      const pathname = `/${trim(url.pathname.replace(options?.prefix ?? '', ''), '/')}`
      const query = url.searchParams
      const customMethod = request.method === 'POST' ? query.get('method')?.toUpperCase() : undefined
      const matchedMethod = customMethod || request.method

      const matched = await this.procedureMatcher.match(matchedMethod, pathname)

      if (!matched) {
        throw new ORPCError({ code: 'NOT_FOUND', message: 'Not found' })
      }

      const input = await this.decodeInput(matched.procedure, matched.params, request)

      const coercedInput = this.compositeSchemaCoercer.coerce(matched.procedure['~orpc'].contract['~orpc'].InputSchema, input)

      const client = createProcedureClient({
        context,
        procedure: matched.procedure,
        path: matched.path,
      })

      const output = await client(coercedInput, { signal: options?.signal })

      const { body, headers: resHeaders } = this.payloadCodec.encode(output)

      return new Response(body, {
        headers: resHeaders,
        status: matched.procedure['~orpc'].contract['~orpc'].route?.successStatus ?? 200,
      })
    }

    try {
      return await executeWithHooks({
        context,
        execute,
        input: request,
        hooks: this.options,
        meta: {
          signal: options?.signal,
        },
      })
    }
    catch (e) {
      const error = this.convertToORPCError(e)

      try {
        const { body, headers } = this.payloadCodec.encode(error.toJSON(), accept)
        return new Response(body, {
          status: error.status,
          headers,
        })
      }
      catch (e) {
        /**
         * This catch usually happens when the `Accept` header is not supported.
         */

        const error = this.convertToORPCError(e)

        const { body, headers } = this.payloadCodec.encode(error.toJSON())
        return new Response(body, {
          status: error.status,
          headers,
        })
      }
    }
  }

  private async decodeInput(procedure: ANY_PROCEDURE, params: Params, request: Request): Promise<unknown> {
    const inputStructure = procedure['~orpc'].contract['~orpc'].route?.inputStructure

    const url = new URL(request.url)
    const query = url.searchParams
    const headers = request.headers

    if (!inputStructure || inputStructure === 'compact') {
      return this.inputStructureCompact.build(
        params,
        request.method === 'GET'
          ? await this.payloadCodec.decode(query)
          : await this.payloadCodec.decode(request),
      )
    }

    const _expect: 'detailed' = inputStructure

    const decodedQuery = await this.payloadCodec.decode(query)
    const decodedHeaders = await this.payloadCodec.decode(headers)
    const decodedBody = await this.payloadCodec.decode(request)

    return this.inputStructureDetailed.build(params, decodedQuery, decodedHeaders, decodedBody)
  }

  private convertToORPCError(e: unknown): ORPCError<any, any> {
    return e instanceof ORPCError
      ? e
      : new ORPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        cause: e,
      })
  }
}
