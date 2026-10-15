import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import {
  clearPendingOrder,
  getAttemptKey,
  getPendingOrder,
  releaseAttemptKey,
  setPendingOrder,
} from "@/checkout/order-attempts"
import { useCurrentUserId } from "@/session/use-session"

import { ordersApi, quotesApi } from "../endpoints"
import { isApiError, isTransportFailure } from "../errors"
import { queryKeys } from "../query-keys"
import { TERMINAL_ORDER_STATUSES, type CreateOrderRequest, type Network, type Order, type Quote } from "../types"

/** Gera a cotação usada na revisão. É a referência de valores para criar o pedido. */
export function useCreateQuote() {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()
  return useMutation({
    mutationFn: (network: Network) => quotesApi.create({ network }),
    onError: (error) => {
      // Estoque/limite mudou: o carrinho precisa refletir o estado atual.
      if (isApiError(error) && error.status === 409 && userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(userId) })
      }
    },
  })
}

/** Cotação recalculada pelo servidor num 409 QUOTE_STALE (exige nova confirmação). */
export function staleQuoteFrom(error: unknown): Quote | null {
  if (!isApiError(error, "QUOTE_STALE")) return null
  const details = error.details as { quote?: Quote } | undefined
  return details?.quote ?? null
}

const ORDER_RETRIES = 2

/**
 * Cria o pedido com Idempotency-Key. Repetições automáticas acontecem só quando não houve
 * resposta (rede/timeout) e reusam a mesma chave: o servidor devolve o mesmo pedido.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()

  return useMutation({
    mutationFn: (request: CreateOrderRequest) => {
      const idempotencyKey = getAttemptKey(request)
      return ordersApi.create(request, idempotencyKey).then((order) => ({ order, idempotencyKey }))
    },
    retry: (failureCount, error) => failureCount < ORDER_RETRIES && isTransportFailure(error),
    retryDelay: 1000,
    onSuccess: ({ order, idempotencyKey }) => {
      if (!userId) return
      queryClient.setQueryData(queryKeys.private.order(userId, order.id), order)
      if (order.status === "pending") setPendingOrder(userId, { orderId: order.id, idempotencyKey })
      else void handleOrderSettled(queryClient, userId, order)
      void queryClient.invalidateQueries({ queryKey: queryKeys.private.pendingOrders(userId) })
    },
    onError: (error) => {
      if (userId && isApiError(error) && (error.code === "OUT_OF_STOCK" || error.code === "QUANTITY_LIMIT")) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(userId) })
      }
    },
  })
}

const settledOrders = new Set<string>()

/**
 * Efeitos de um pedido que chegou a um estado final — executados uma única vez por versão,
 * venham do polling, da resposta REST ou do evento `order.updated`.
 */
export async function handleOrderSettled(queryClient: QueryClient, userId: string, order: Pick<Order, "id" | "status" | "version">) {
  if (!TERMINAL_ORDER_STATUSES.includes(order.status)) return
  const marker = `${order.id}@${order.version}`
  if (settledOrders.has(marker)) return
  settledOrders.add(marker)

  const pending = getPendingOrder(userId)
  if (order.status === "rejected" && pending?.orderId === order.id) releaseAttemptKey(pending.idempotencyKey)
  clearPendingOrder(userId, order.id)

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.private.pendingOrders(userId) }),
    // Confirmado: o servidor removeu do carrinho os itens comprados e baixou o estoque.
    order.status === "confirmed" && queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(userId) }),
    order.status === "confirmed" && queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all() }),
  ])
}

const PENDING_POLL_MS = 5000

/** Pedido por id. Enquanto `pending`, faz polling (fallback do socket); estados finais param. */
export function useOrder(orderId: string | null | undefined) {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()
  const query = useQuery({
    queryKey: queryKeys.private.order(userId ?? "anonymous", orderId ?? "none"),
    queryFn: ({ signal }) => ordersApi.get(orderId!, { signal }),
    enabled: Boolean(userId && orderId),
    staleTime: 0,
    refetchInterval: (current) => (current.state.data?.status === "pending" ? PENDING_POLL_MS : false),
  })

  useEffect(() => {
    if (userId && query.data) void handleOrderSettled(queryClient, userId, query.data)
  }, [queryClient, userId, query.data])

  return query
}

/** Pedidos pendentes do usuário no servidor (recuperação mesmo sem o id local). */
export function usePendingOrders() {
  const userId = useCurrentUserId()
  return useQuery({
    queryKey: queryKeys.private.pendingOrders(userId ?? "anonymous"),
    queryFn: ({ signal }) => ordersApi.list("pending", { signal }),
    enabled: Boolean(userId),
    staleTime: 0,
  })
}

/** Retoma o acompanhamento do pedido pendente salvo neste navegador. */
export function useResumePendingOrder() {
  const userId = useCurrentUserId()
  const pending = userId ? getPendingOrder(userId) : null
  return useOrder(pending?.orderId)
}
