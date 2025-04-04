import type { IncomingMessage, ServerResponse } from 'node:http'
import type { StandardHandlerPlugin } from '../standard'
import type { NodeHttpHandler, NodeHttpHandlerPlugin } from './handler'

describe('NodeHttpHandlerPlugin', () => {
  it('backward compatibility', () => {
    expectTypeOf<NodeHttpHandlerPlugin<{ a: string }>>().toMatchTypeOf<StandardHandlerPlugin<{ a: string }>>()
    expectTypeOf<StandardHandlerPlugin<{ a: string }>>().toMatchTypeOf<NodeHttpHandlerPlugin<{ a: string }>>()
  })
})

describe('NodeHttpHandler', () => {
  it('optional context when all context is optional', () => {
    const handler = {} as NodeHttpHandler<{ auth?: boolean }>

    handler.handle({} as IncomingMessage, {} as ServerResponse)
    handler.handle({} as IncomingMessage, {} as ServerResponse, { context: { auth: true } })

    const handler2 = {} as NodeHttpHandler<{ auth: boolean }>

    handler2.handle({} as IncomingMessage, {} as ServerResponse, { context: { auth: true } })
    // @ts-expect-error -- context is required
    handler2.handle({} as IncomingMessage, {} as ServerResponse)
  })
})
