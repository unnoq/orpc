import type { StandardRequest } from '@orpc/standard-server'
import * as StandardServerFetch from '@orpc/standard-server-fetch'
import { LinkFetchClient } from './link-fetch-client'

const toFetchRequestSpy = vi.spyOn(StandardServerFetch, 'toFetchRequest')
const toStandardLazyResponseSpy = vi.spyOn(StandardServerFetch, 'toStandardLazyResponse')

describe('linkFetchClient', () => {
  it('call', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('body'))
    const client = new LinkFetchClient({
      fetch,
    })

    const standardRequest: StandardRequest = {
      url: new URL('http://localhost:300/example'),
      body: { body: true },
      headers: {
        'x-custom': 'value',
      },
      method: 'POST',
      signal: AbortSignal.timeout(100),
    }

    const options = {
      context: { context: true },
      lastEventId: 'last-event-id',
      signal: AbortSignal.timeout(100),
    }

    const response = await client.call(standardRequest, options, ['example'], { body: true })

    expect(toFetchRequestSpy).toBeCalledTimes(1)
    expect(toFetchRequestSpy).toBeCalledWith(standardRequest, { fetch })

    expect(response).toBe(toStandardLazyResponseSpy.mock.results[0]!.value)
    expect(toStandardLazyResponseSpy).toBeCalledTimes(1)
    expect(toStandardLazyResponseSpy).toBeCalledWith(
      await fetch.mock.results[0]!.value,
      { signal: toFetchRequestSpy.mock.results[0]!.value.signal },
    )

    expect(fetch).toBeCalledTimes(1)
    expect(fetch).toBeCalledWith(
      toFetchRequestSpy.mock.results[0]!.value,
      { redirect: 'manual' },
      options,
      ['example'],
      { body: true },
    )
  })
})
