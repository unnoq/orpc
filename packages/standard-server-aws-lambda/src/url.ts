import type { APIGatewayEvent } from 'aws-lambda'
import { flattenHeader } from '@orpc/standard-server'

export function toStandardUrl(event: APIGatewayEvent): URL {
  const host = event.requestContext.domainName ?? event.headers.host ?? flattenHeader(event.multiValueHeaders.host) ?? 'localhost'
  const url = new URL(`https://${host}${event.path}`)

  if (event.queryStringParameters) {
    for (const key in event.queryStringParameters) {
      const value = event.queryStringParameters[key]
      if (typeof value === 'string') {
        url.searchParams.append(key, value)
      }
    }
  }

  if (event.multiValueQueryStringParameters) {
    for (const key in event.multiValueQueryStringParameters) {
      const value = event.multiValueQueryStringParameters[key]
      if (value) {
        for (const v of value) {
          url.searchParams.append(key, v)
        }
      }
    }
  }

  return url
}
