import { QueryClient } from "@tanstack/react-query"

import { isRetryable } from "./errors"

const MAX_QUERY_RETRIES = 2
const MAX_RETRY_DELAY_MS = 4000

/** Backoff exponencial: 500 ms → 1 s → 2 s (máx. 4 s). */
export function retryDelay(attempt: number) {
  return Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS)
}

/**
 * Política padrão (docs/design.md §4): queries repetem até 2 vezes apenas erros transitórios
 * (rede, timeout, 5xx); 4xx nunca. Mutations não repetem por padrão.
 */
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
