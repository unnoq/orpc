import { handleFetchRequest } from './handle-request'
import { createORPCHandler } from './orpc-handler'

it('assignable to handlers', () => {
  handleFetchRequest({
    request: new Request('https://example.com', {}),
    router: {},
    handlers: [
      createORPCHandler(),
    ],
  })

  handleFetchRequest({
    request: new Request('https://example.com', {}),
    router: {},
    handlers: [
      // @ts-expect-error - invalid handler
      createORPCHandler,
    ],
  })
})
