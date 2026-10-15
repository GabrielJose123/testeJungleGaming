import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it } from "vitest"

import { queryKeys } from "@/api/query-keys"
import type { Cart, NftDetail, NftUpdatedEvent, Order, OrderUpdatedEvent } from "@/api/types"
import { createSeedDatabase, setDatabase } from "@/mocks/db/store"
import { requireNft, toDetail } from "@/mocks/domain/catalog"
import { setSession } from "@/session/session-store"

import { applyNftUpdated, applyOrderUpdated } from "./apply-events"
import { EventGate } from "./event-gate"

function nftEvent(eventId: string, version: number, priceEth: string): NftUpdatedEvent {
  return {
    eventId,
    type: "nft.updated",
    resource: { type: "nft", id: "emerald-ape-042" },
    version,
    occurredAt: new Date().toISOString(),
    data: { priceEth, previousPriceEth: "1.19", available: 39, editions: [{ id: "1-50", priceEth, available: 32, status: "available" }] },
  }
}

describe("aplicação de eventos no cache", () => {
  let queryClient: QueryClient
  let gate: EventGate

  beforeEach(() => {
    setDatabase(createSeedDatabase())
    queryClient = new QueryClient()
    gate = new EventGate()
    queryClient.setQueryData(queryKeys.nfts.detail("emerald-ape-042"), toDetail(requireNft("emerald-ape-042")))
  })

  it("nft.updated atualiza o detalhe e ignora versões antigas e duplicatas", () => {
    const key = queryKeys.nfts.detail("emerald-ape-042")
    expect(applyNftUpdated(queryClient, gate, nftEvent("e1", 3, "1.6"))).toBe(true)
    expect(queryClient.getQueryData<NftDetail>(key)).toMatchObject({ version: 3, priceEth: "1.6" })

    // Antigo (v2) chegando depois: não regride.
    expect(applyNftUpdated(queryClient, gate, nftEvent("e2", 2, "1.5"))).toBe(false)
    // Duplicata: não reaplica.
    expect(applyNftUpdated(queryClient, gate, nftEvent("e1", 3, "1.6"))).toBe(false)
    expect(queryClient.getQueryData<NftDetail>(key)).toMatchObject({ version: 3, priceEth: "1.6" })
  })

  it("evento com versão já superada pelo REST é descartado", () => {
    const key = queryKeys.nfts.detail("emerald-ape-042")
    queryClient.setQueryData<NftDetail>(key, (current) => current && { ...current, version: 5 })
    expect(applyNftUpdated(queryClient, gate, nftEvent("e1", 4, "9.99"))).toBe(false)
    expect(queryClient.getQueryData<NftDetail>(key)?.priceEth).not.toBe("9.99")
  })

  it("nft.updated invalida o carrinho que contém o NFT", () => {
    const cartKey = queryKeys.private.cart("guest:abc")
    queryClient.setQueryData<Partial<Cart>>(cartKey, { items: [{ nftId: "emerald-ape-042", name: "Emerald Ape #042" } as Cart["items"][number]] })
    applyNftUpdated(queryClient, gate, nftEvent("e1", 2, "1.5"))
    expect(queryClient.getQueryState(cartKey)?.isInvalidated).toBe(true)
  })

  it("order.updated de outro usuário (sessão anterior) não é aplicado", () => {
    setSession({ token: "t", expiresAt: new Date(Date.now() + 60_000).toISOString(), user: { id: "user-bruno", name: "Bruno", email: "b@x.dev", avatarUrl: null, bio: "", createdAt: "" } })
    const key = queryKeys.private.order("user-bruno", "order-1")
    queryClient.setQueryData<Partial<Order>>(key, { id: "order-1", status: "pending", version: 1 })
    const event: OrderUpdatedEvent = {
      eventId: "o1",
      type: "order.updated",
      resource: { type: "order", id: "order-1" },
      version: 2,
      occurredAt: new Date().toISOString(),
      data: { userId: "user-ana", status: "confirmed", previousStatus: "pending", transaction: null, failureReason: null },
    }
    expect(applyOrderUpdated(queryClient, gate, event)).toBe(false)
    expect(queryClient.getQueryData<Order>(key)?.status).toBe("pending")

    expect(applyOrderUpdated(queryClient, gate, { ...event, eventId: "o2", data: { ...event.data, userId: "user-bruno" } })).toBe(true)
    expect(queryClient.getQueryData<Order>(key)).toMatchObject({ status: "confirmed", version: 2 })
  })
})
