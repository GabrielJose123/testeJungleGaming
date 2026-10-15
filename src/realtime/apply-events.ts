import type { QueryClient } from "@tanstack/react-query"

import { handleOrderSettled } from "@/api/hooks/checkout"
import { queryKeys } from "@/api/query-keys"
import type { Cart, NftDetail, NftPage, NftUpdatedEvent, Order, OrderUpdatedEvent } from "@/api/types"
import { getSession } from "@/session/session-store"

import type { EventGate } from "./event-gate"
import { realtimeStore } from "./realtime-store"

/** Maior versão do NFT já presente no cache (detalhe ou qualquer listagem). */
function cachedNftVersion(queryClient: QueryClient, nftId: string) {
  let version = queryClient.getQueryData<NftDetail>(queryKeys.nfts.detail(nftId))?.version ?? 0
  for (const [, page] of queryClient.getQueriesData<NftPage>({ queryKey: queryKeys.nfts.lists() })) {
    const item = page?.items.find((entry) => entry.id === nftId)
    if (item && item.version > version) version = item.version
  }
  return version
}

/**
 * `nft.updated`: atualiza preço/estoque no detalhe e nas listas (só se a versão for maior),
 * revalida o carrinho que contém o NFT (o servidor recalcula o resumo) e registra a mudança
 * para o checkout e para os avisos acessíveis.
 */
export function applyNftUpdated(queryClient: QueryClient, gate: EventGate, event: NftUpdatedEvent) {
  const nftId = event.resource.id
  if (gate.accept(event, cachedNftVersion(queryClient, nftId)) !== "accepted") return false
  const { data, version } = event

  queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (current) => {
    if (!current || current.version >= version) return current
    const editions = current.editions.map((edition) => {
      const update = data.editions.find((entry) => entry.id === edition.id)
      return update ? { ...edition, ...update } : edition
    })
    return { ...current, editions, priceEth: data.priceEth, previousPriceEth: data.previousPriceEth, available: data.available, version }
  })

  queryClient.setQueriesData<NftPage>({ queryKey: queryKeys.nfts.lists() }, (page) => {
    if (!page?.items.some((item) => item.id === nftId && item.version < version)) return page
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === nftId && item.version < version
          ? { ...item, priceEth: data.priceEth, previousPriceEth: data.previousPriceEth, available: data.available, version }
          : item,
      ),
    }
  })

  // Carrinhos em cache que contêm o NFT: o REST é a fonte do resumo e das `issues`.
  let inCart = false
  let name: string | null = null
  for (const [key, cart] of queryClient.getQueriesData<Cart>({ queryKey: queryKeys.private.all() })) {
    if (key[2] !== "cart" || !cart) continue
    const item = cart.items.find((entry) => entry.nftId === nftId)
    if (item) {
      inCart = true
      name = item.name
      void queryClient.invalidateQueries({ queryKey: key, exact: true })
    }
  }
  name ??= queryClient.getQueryData<NftDetail>(queryKeys.nfts.detail(nftId))?.name ?? null

  const at = Date.now()
  realtimeStore.recordNftChange(nftId, { version, at })
  realtimeStore.pushNotice({
    id: event.eventId,
    kind: "nft-changed",
    nftId,
    name,
    priceEth: data.priceEth,
    previousPriceEth: data.previousPriceEth,
    available: data.available,
    inCart,
    at,
  })
  return true
}

/**
 * `order.updated`: só para o usuário atual; atualiza o pedido em cache sem regredir versão
 * e dispara os efeitos de estado final (uma única vez).
 */
export function applyOrderUpdated(queryClient: QueryClient, gate: EventGate, event: OrderUpdatedEvent) {
  const userId = getSession()?.user.id
  if (!userId || event.data.userId !== userId) return false

  const key = queryKeys.private.order(userId, event.resource.id)
  const cached = queryClient.getQueryData<Order>(key)
  if (gate.accept(event, cached?.version ?? 0) !== "accepted") return false

  if (cached) {
    queryClient.setQueryData<Order>(key, {
      ...cached,
      status: event.data.status,
      version: event.version,
      transaction: event.data.transaction,
      failureReason: event.data.failureReason,
      updatedAt: event.occurredAt,
    })
  } else {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  void handleOrderSettled(queryClient, userId, { id: event.resource.id, status: event.data.status, version: event.version })
  realtimeStore.pushNotice({ id: event.eventId, kind: "order-changed", orderId: event.resource.id, status: event.data.status, at: Date.now() })
  return true
}
