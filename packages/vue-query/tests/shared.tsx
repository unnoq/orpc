import { QueryClient } from '@tanstack/vue-query'
import { orpc as client } from '../../client/tests/shared'
import { createORPCVueQueryUtils } from '../src'

export const orpc = createORPCVueQueryUtils(client)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
