import { StandardHandler } from '@orpc/server/standard'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-node'
import inject from 'light-my-request'
import { router } from '../../../../server/tests/shared'
import { OpenAPIHandler } from './openapi-handler'

vi.mock('@orpc/standard-server-node', () => ({
  toStandardLazyRequest: vi.fn(),
  sendStandardResponse: vi.fn(),
}))

vi.mock('@orpc/server/standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('openapiHandler', async () => {
  const handle = vi.fn()

  vi.mocked(StandardHandler).mockReturnValue({
    handle,
  } as any)

  const handler = new OpenAPIHandler(router)

  let req: any, res: any

  await inject((_req, _res) => {
    req = _req
    res = _res
    _res.end()
  }, {
    url: '/',
  })

  const standardRequest = {
    raw: {},
    method: 'POST',
    url: new URL('https://example.com/api/v1/users/1'),
    headers: {
      'content-type': 'application/json',
      'content-length': '12',
    },
    body: () => Promise.resolve(JSON.stringify({ name: 'John Doe' })),
    signal: undefined,
  }

  it('on match', async () => {
    vi.mocked(toStandardLazyRequest).mockReturnValueOnce(standardRequest)
    handle.mockReturnValueOnce({
      matched: true,
      response: {
        status: 200,
        headers: {},
        body: '__body__',
      },
    })

    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const
    const result = await handler.handle(req, res, options)

    expect(result).toEqual({
      matched: true,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      standardRequest,
      options,
    )

    expect(toStandardLazyRequest).toHaveBeenCalledOnce()
    expect(toStandardLazyRequest).toHaveBeenCalledWith(req, res)

    expect(sendStandardResponse).toHaveBeenCalledOnce()
    expect(sendStandardResponse).toHaveBeenCalledWith(res, {
      status: 200,
      headers: {},
      body: '__body__',
    }, options)
  })

  it('on mismatch', async () => {
    vi.mocked(toStandardLazyRequest).mockReturnValueOnce(standardRequest)
    handle.mockReturnValueOnce({
      matched: false,
      response: undefined,
    })

    const result = await handler.handle(req, res, { prefix: '/api/v1', context: { db: 'postgres' } })

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      standardRequest,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(toStandardLazyRequest).toHaveBeenCalledOnce()
    expect(toStandardLazyRequest).toHaveBeenCalledWith(req, res)

    expect(sendStandardResponse).not.toHaveBeenCalled()
  })
})
