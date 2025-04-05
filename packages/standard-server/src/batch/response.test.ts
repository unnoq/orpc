import type { StandardResponse } from '../types'
import { isAsyncIteratorObject } from '@orpc/shared'
import { parseBatchResponse, toBatchResponse } from './response'

describe('toBatchResponse & parseBatchResponse', () => {
  const r1: StandardResponse = { status: 200, headers: { 'x-custom': 'value1' }, body: 'test1' }
  const r2: StandardResponse = { status: 205, headers: { 'x-custom': 'value2' }, body: 'test2' }

  it('success', async () => {
    const response = toBatchResponse({
      status: 207,
      headers: { 'x-custom': 'value' },
      responsePromises: [
        Promise.resolve(r1),
        Promise.resolve(r2),
      ],
    })

    expect(response.status).toEqual(207)
    expect(response.headers).toEqual({ 'x-custom': 'value' })

    const parsed = parseBatchResponse(response)

    expect(parsed).toSatisfy(isAsyncIteratorObject)

    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r1, index: 0 } })
    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r2, index: 1 } })
    await expect(parsed.next()).resolves.toEqual({ done: true, value: undefined })
  })

  it('on rejects', async () => {
    const response = toBatchResponse({
      status: 207,
      headers: { 'x-custom': 'value' },
      responsePromises: [
        Promise.resolve(r1),
        Promise.reject(new Error('Something went wrong')),
        Promise.resolve(r2),
      ],
    })

    expect(response.status).toEqual(207)
    expect(response.headers).toEqual({ 'x-custom': 'value' })

    const parsed = parseBatchResponse(response)

    expect(parsed).toSatisfy(isAsyncIteratorObject)

    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r1, index: 0 } })
    await expect(parsed.next()).resolves.toEqual({
      done: false,
      value: {
        index: 1,
        status: 500,
        headers: {},
        body: {
          defined: false,
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          message: 'Something went wrong while processing the batch response',
          data: { index: 1 },
        },
      },
    })
    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r2, index: 2 } })
    await expect(parsed.next()).resolves.toEqual({ done: true, value: undefined })
  })

  it('yields the fastest response', async () => {
    const response = toBatchResponse({
      status: 207,
      headers: { 'x-custom': 'value' },
      responsePromises: [
        new Promise(resolve => setTimeout(() => resolve(r2), 60)),
        new Promise(resolve => setTimeout(() => resolve(r2), 0)),
        new Promise(resolve => setTimeout(() => resolve(r1), 90)),
        new Promise(resolve => setTimeout(() => resolve(r1), 30)),
      ],
    })

    expect(response.status).toEqual(207)
    expect(response.headers).toEqual({ 'x-custom': 'value' })

    const parsed = parseBatchResponse(response)

    expect(parsed).toSatisfy(isAsyncIteratorObject)

    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r2, index: 1 } })
    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r1, index: 3 } })
    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r2, index: 0 } })
    await expect(parsed.next()).resolves.toEqual({ done: false, value: { ...r1, index: 2 } })
    await expect(parsed.next()).resolves.toEqual({ done: true, value: undefined })
  })
})

describe('parseBatchResponse', () => {
  it('throw on invalid batch body', () => {
    expect(
      () => parseBatchResponse({ status: 207, headers: { 'x-custom': 'value' }, body: undefined }),
    ).toThrow('Invalid batch response')

    expect(
      () => parseBatchResponse({ status: 207, headers: { 'x-custom': 'value' }, body: '123' }),
    ).toThrow('Invalid batch response')
  })

  it('throw on invalid batch item', async () => {
    const parsed = parseBatchResponse(toBatchResponse({
      status: 207,
      headers: { 'x-custom': 'value' },
      responsePromises: [
        Promise.resolve('invalid' as any),
      ],
    }))

    await expect(parsed.next()).rejects.toThrow('Invalid batch response')
  })
})
