import type { StandardRequest } from '@orpc/standard-server'
import { isAsyncIteratorObject } from '@orpc/shared'
import * as Body from './body'
import * as Headers from './headers'
import { toFetchRequest, toStandardLazyRequest } from './request'

const toStandardBodySpy = vi.spyOn(Body, 'toStandardBody')
const toFetchBodySpy = vi.spyOn(Body, 'toFetchBody')
const toStandardHeadersSpy = vi.spyOn(Headers, 'toStandardHeaders')
const toFetchHeadersSpy = vi.spyOn(Headers, 'toFetchHeaders')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toStandardLazyRequest', () => {
  it('works', () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: {
        'content-type': 'application/json',
      },
    })

    const standardRequest = toStandardLazyRequest(request)

    expect(standardRequest.url).toEqual(new URL('https://example.com'))
    expect(standardRequest.method).toBe('POST')
    expect(standardRequest.signal).toBe(request.signal)
    expect(standardRequest.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value)
    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value)

    expect(toStandardHeadersSpy).toBeCalledTimes(1)
    expect(toStandardHeadersSpy).toBeCalledWith(request.headers)

    expect(toStandardBodySpy).toBeCalledTimes(1)
    expect(toStandardBodySpy).toBeCalledWith(request, { signal: request.signal })
  })

  it('lazy headers', async () => {
    const response = new Request('https://example.com', {
      headers: {
        'x-custom-header': 'custom-value',
      },
    })

    const lazyResponse = toStandardLazyRequest(response)

    expect(toStandardHeadersSpy).toBeCalledTimes(0)
    lazyResponse.headers = { overrided: '1' }
    expect(lazyResponse.headers).toEqual({ overrided: '1' }) // can override before access
    expect(toStandardHeadersSpy).toBeCalledTimes(0)

    const lazyResponse2 = toStandardLazyRequest(response)
    expect(lazyResponse2.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value)
    expect(lazyResponse2.headers).toEqual(toStandardHeadersSpy.mock.results[0]!.value) // ensure cached
    expect(toStandardHeadersSpy).toBeCalledTimes(1)

    lazyResponse2.headers = { overrided: '2' }
    expect(lazyResponse2.headers).toEqual({ overrided: '2' }) // can override after access
  })

  it('lazy body', async () => {
    const response = new Request('https://example.com')

    const lazyResponse = toStandardLazyRequest(response)

    expect(toStandardBodySpy).toBeCalledTimes(0)
    const overrideBody = () => Promise.resolve('1')
    lazyResponse.body = overrideBody
    expect(lazyResponse.body).toBe(overrideBody)
    expect(toStandardBodySpy).toBeCalledTimes(0)

    const lazyResponse2 = toStandardLazyRequest(response)
    expect(lazyResponse2.body()).toEqual(toStandardBodySpy.mock.results[0]!.value)
    expect(lazyResponse2.body()).toEqual(toStandardBodySpy.mock.results[0]!.value) // ensure cached
    expect(toStandardBodySpy).toBeCalledTimes(1)
  })

  it('with event iterator', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('event: message\ndata: "foo"\n\n')
        controller.enqueue('event: done\ndata: "bar"\n\n')
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream())

    const request = new Request('https://example.com', {
      method: 'POST',
      body: stream,
      headers: {
        'content-type': 'text/event-stream',
      },
      duplex: 'half',
    })

    const body = await toStandardLazyRequest(request).body() as AsyncGenerator

    expect(body).toSatisfy(isAsyncIteratorObject)
    expect(await body.next()).toEqual({ done: false, value: 'foo' })
    expect(await body.next()).toEqual({ done: true, value: 'bar' })
  })
})

describe('toFetchRequest', () => {
  it('works', async () => {
    const controller = new AbortController()

    const standardRequest: StandardRequest = {
      url: new URL('https://example.com'),
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-foo': 'bar',
      },
      body: { foo: 'bar' },
    }

    const fetchRequest = toFetchRequest(standardRequest, { eventIteratorKeepAliveComment: 'test' })
    expect(fetchRequest.url).toEqual(standardRequest.url.href)
    expect(fetchRequest.method).toEqual(standardRequest.method)
    expect(fetchRequest.headers).toEqual(toFetchHeadersSpy.mock.results[0]!.value)

    expect(toFetchHeadersSpy).toHaveBeenCalledTimes(1)
    expect(toFetchHeadersSpy).toHaveBeenCalledWith(standardRequest.headers)

    expect(toFetchBodySpy).toHaveBeenCalledTimes(1)
    expect(toFetchBodySpy).toHaveBeenCalledWith(standardRequest.body, toFetchHeadersSpy.mock.results[0]!.value, { eventIteratorKeepAliveComment: 'test' })

    await expect(fetchRequest.json()).resolves.toEqual(standardRequest.body)

    const fetchSignal = fetchRequest.signal

    expect(fetchSignal.aborted).toBe(false)
    controller.abort()
    expect(fetchSignal.aborted).toBe(true)
  })
})
