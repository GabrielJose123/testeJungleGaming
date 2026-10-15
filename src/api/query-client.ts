import { QueryClient } from "@tanstack/react-query"

import { isRetryable } from "./errors"

const MAX_QUERY_RETRIES = 2
const MAX_RETRY_DELAY_MS = 4000

export function retryDelay(attempt: number) {
  return Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => isRetryable(error) && failureCount < MAX_QUERY_RETRIES,
        retryDelay,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
