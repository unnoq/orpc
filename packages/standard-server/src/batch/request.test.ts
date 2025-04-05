import { parseBatchRequest, toBatchRequest } from './request'
import * as SignalModule from './signal'

const toBatchSignalSpy = vi.spyOn(SignalModule, 'toBatchAbortSignal')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toBatchRequest & parseBatchRequest', () => {
  const url1 = new URL('http://localhost:3000/?a=1')
  const url2 = new URL('http://localhost:3001')
  const url3 = new URL('http://localhost:3002')
  const signal1 = AbortSignal.timeout(101)
  const signal2 = AbortSignal.timeout(102)

  const headers1 = { 'x-custom': 'value' }
  const headers2 = { 'x-custom': 'value' }
  const headers3 = { 'x-custom': 'value' }

  it('method GET', () => {
    const request = toBatchRequest({
      headers: headers1,
      url: url1,
      method: 'GET',
      requests: [
        { url: url2, method: 'GET', headers: headers2, body: undefined, signal: signal1 },
        { url: url3, method: 'DELETE', headers: headers3, body: { value: 'test' }, signal: signal2 },
      ],
    })

    expect(request.method).toEqual('GET')
    expect(request.headers).toEqual(headers1)
    expect(request.signal).toBe(toBatchSignalSpy.mock.results[0]!.value)

    expect(toBatchSignalSpy).toHaveBeenCalledTimes(1)
    expect(toBatchSignalSpy).toHaveBeenCalledWith([signal1, signal2])

    const parsed = parseBatchRequest(request)

    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({
      method: 'GET',
      url: url2,
      headers: headers2,
      body: undefined,
      signal: request.signal,
    })

    expect(parsed[1]).toEqual({
      method: 'DELETE',
      url: url3,
      headers: headers3,
      body: { value: 'test' },
      signal: request.signal,
    })
  })

  it('method POST', () => {
    const request = toBatchRequest({
      headers: headers1,
      url: url1,
      method: 'POST',
      requests: [
        { url: url2, method: 'GET', headers: headers2, body: undefined, signal: signal1 },
        { url: url3, method: 'DELETE', headers: headers3, body: { value: 'test' }, signal: signal2 },
      ],
    })

    expect(request.method).toEqual('POST')
    expect(request.headers).toEqual(headers1)
    expect(request.signal).toBe(toBatchSignalSpy.mock.results[0]!.value)

    expect(toBatchSignalSpy).toHaveBeenCalledTimes(1)
    expect(toBatchSignalSpy).toHaveBeenCalledWith([signal1, signal2])

    const parsed = parseBatchRequest(request)

    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({
      method: 'GET',
      url: url2,
      headers: headers2,
      body: undefined,
      signal: request.signal,
    })

    expect(parsed[1]).toEqual({
      method: 'DELETE',
      url: url3,
      headers: headers3,
      body: { value: 'test' },
      signal: request.signal,
    })
  })
})

describe('parseBatchRequest', () => {
  const url1 = new URL('http://localhost:3000/?a=1')
  const signal1 = AbortSignal.timeout(101)
  const headers1 = { 'x-custom': 'value' }

  it('throw on invalid batch request', () => {
    expect(
      () => parseBatchRequest({ method: 'GET', url: url1, headers: headers1, body: undefined, signal: signal1 }),
    ).toThrow('Invalid batch request')

    expect(
      () => parseBatchRequest({ method: 'POST', url: url1, headers: headers1, body: undefined, signal: signal1 }),
    ).toThrow('Invalid batch request')

    expect(
      () => parseBatchRequest({ method: 'POST', url: url1, headers: headers1, body: '123', signal: signal1 }),
    ).toThrow('Invalid batch request')
  })
})
