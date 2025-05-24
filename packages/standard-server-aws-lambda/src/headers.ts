import type { StandardHeaders } from '@orpc/standard-server'
import type { APIGatewayProxyEventHeaders, APIGatewayProxyEventMultiValueHeaders } from 'aws-lambda'
import { toArray } from '@orpc/shared'
import { flattenHeader } from '@orpc/standard-server'

export function toStandardHeaders(
  headers: APIGatewayProxyEventHeaders,
  multiValueHeaders: APIGatewayProxyEventMultiValueHeaders,
): StandardHeaders {
  return {
    ...headers,
    ...multiValueHeaders,
  }
}

export function toLambdaHeaders(standard: StandardHeaders): [headers: APIGatewayProxyEventHeaders, setCookies: string[]] {
  const headers: APIGatewayProxyEventHeaders = {}
  const setCookies: string[] = []

  for (const key in standard) {
    const value = standard[key]

    if (value === undefined) {
      continue
    }

    if (key === 'set-cookie') {
      setCookies.push(...toArray(value))
    }
    else {
      headers[key] = flattenHeader(value)
    }
  }

  return [headers, setCookies]
}
