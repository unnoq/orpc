import type { APIGatewayProxyEventV2 } from './types'
import Stream from 'node:stream'
import { isAsyncIteratorObject } from '@orpc/shared'
import * as NodeModule from '@orpc/standard-server-node'
import * as Body from './body'
import * as Headers from './headers'
import { toStandardLazyRequest } from './request'

const toStandardBodySpy = vi.spyOn(Body, 'toStandardBody')
const toStandardHeadersSpy = vi.spyOn(Headers, 'toStandardHeaders')
const toAbortSignalSpy = vi.spyOn(NodeModule, 'toAbortSignal')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toStandardLazyRequest', () => {
  const event: APIGatewayProxyEventV2 = {
    body: JSON.stringify({ foo: 'bar' }),
    rawPath: '/',
    rawQueryString: '',
    routeKey: '$default',
    version: '2.0',
    headers: {
      'host': 'example.com',
      'content-type': 'application/json',
    },
    isBase64Encoded: false,
    cookies: ['foo=bar', 'bar=baz'],
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      domainName: 'example.com',
      http: {
        method: 'POST',
        path: '/',
        protocol: 'HTTP/1.1',
      },
    },
    stageVariables: {},
  }

  it('works', () => {
    const responseStream = new Stream.Writable()
    const standardRequest = toStandardLazyRequest(event, responseStream)

    expect(standardRequest.url).toEqual(new URL('https://example.com/?'))
    expect(standardRequest.method).toBe('POST')
    expect(standardRequest.signal).toBe(toAbortSignalSpy.mock.results[0]!.value)
    expect(standardRequest.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value)
    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value)

    expect(toAbortSignalSpy).toBeCalledTimes(1)
    expect(toAbortSignalSpy).toBeCalledWith(responseStream)

    expect(toStandardHeadersSpy).toBeCalledTimes(1)
    expect(toStandardHeadersSpy).toBeCalledWith(event.headers, event.cookies)

    expect(toStandardBodySpy).toBeCalledTimes(1)
    expect(toStandardBodySpy).toBeCalledWith(event, { signal: toAbortSignalSpy.mock.results[0]!.value })
  })

  it('lazy body', async () => {
    const responseStream = new Stream.Writable()
    const lazyResponse = toStandardLazyRequest(event, responseStream)

    expect(toStandardBodySpy).toBeCalledTimes(0)
    const overrideBody = () => Promise.resolve('1')
    lazyResponse.body = overrideBody
    expect(lazyResponse.body).toBe(overrideBody)
    expect(toStandardBodySpy).toBeCalledTimes(0)

    const lazyResponse2 = toStandardLazyRequest(event, responseStream)
    expect(lazyResponse2.body()).toEqual(toStandardBodySpy.mock.results[0]!.value)
    expect(lazyResponse2.body()).toEqual(toStandardBodySpy.mock.results[0]!.value) // ensure cached
    expect(toStandardBodySpy).toBeCalledTimes(1)
  })

  it('with event iterator', async () => {
    const responseStream = new Stream.Writable()
    const body = await toStandardLazyRequest({
      ...event,
      body: 'event: message\ndata: "foo"\n\nevent: done\ndata: "bar"\n\n',
      isBase64Encoded: false,
      headers: {
        'content-type': 'text/event-stream',
      },
    }, responseStream).body() as AsyncGenerator

    expect(body).toSatisfy(isAsyncIteratorObject)
    expect(await body.next()).toEqual({ done: false, value: 'foo' })
    expect(await body.next()).toEqual({ done: true, value: 'bar' })
  })
})
