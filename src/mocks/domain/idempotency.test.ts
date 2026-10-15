import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AnyRealtimeEvent, CreateOrderRequest } from "@/api/types"

import { createSeedDatabase, db, mutate, setDatabase } from "../db/store"
import { subscribe } from "../events"
import { addItem, getCart } from "./cart"
import { MockApiError } from "./errors"
import { hashPayload, resolveIdempotency, stableStringify } from "./idempotency"
import { createOrder, createQuote, getOrder, ORDER_SETTLE_MS } from "./orders"

describe("hash de payload", () => {
  it("ignora a ordem das chaves e campos undefined", () => {
    expect(stableStringify({ b: 1, a: { d: [1, 2], c: undefined } })).toBe('{"a":{"d":[1,2]},"b":1}')
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }))
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }))
  })
})

describe("resolveIdempotency", () => {
  const records = [{ key: "k1", userId: "u1", payloadHash: "h1", orderId: "o1" }]

  it("mesma chave + mesmo payload → replay do mesmo pedido", () => {
    expect(resolveIdempotency(records, "u1", "k1", "h1")).toEqual({ kind: "replay", orderId: "o1" })
  })

  it("mesma chave + payload diferente → conflito", () => {
    expect(resolveIdempotency(records, "u1", "k1", "h2")).toEqual({ kind: "conflict", orderId: "o1" })
  })

  it("chaves são isoladas por usuário", () => {
    expect(resolveIdempotency(records, "u2", "k1", "h1")).toEqual({ kind: "new" })
  })
})

describe("POST /orders (domínio)", () => {
  const userId = "user-ana"
  const events: AnyRealtimeEvent[] = []
  let unsubscribe: () => void

  function prepareCheckout(): CreateOrderRequest {
    addItem({ userId }, { nftId: "golden-beat-207", editionId: "1-50", quantity: 2 })
    mutate((data) => {
      data.wallets.find((wallet) => wallet.id === "wallet-ana-primary")!.connection = "connected"
    })
    const quote = createQuote(userId, { network: "ethereum" })
    return {
      quoteId: quote.id,
      walletId: "wallet-ana-primary",
      network: "ethereum",
      collector: { fullName: "Ana Souza", email: "ana@kurio.dev", phone: "11 98888-7777", country: "Brasil" },
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    setDatabase(createSeedDatabase())
    events.length = 0
    unsubscribe = subscribe((event) => events.push(event))
  })

  afterEach(() => {
    unsubscribe()
    vi.useRealTimers()
  })

  it("exige Idempotency-Key", () => {
    const request = prepareCheckout()
    expect(() => createOrder(userId, null, request)).toThrowError(expect.objectContaining({ code: "IDEMPOTENCY_KEY_REQUIRED" }))
  })

  it("repetir a mesma tentativa devolve o mesmo pedido, sem criar outro", () => {
    const request = prepareCheckout()
    const first = createOrder(userId, "key-1", request)
    const retry = createOrder(userId, "key-1", structuredClone(request))
    expect(first.replayed).toBe(false)
    expect(retry.replayed).toBe(true)
    expect(retry.order.id).toBe(first.order.id)
    expect(db().orders).toHaveLength(1)
  })

  it("reutilizar a chave com outro conteúdo gera 409 IDEMPOTENCY_CONFLICT", () => {
    const request = prepareCheckout()
    createOrder(userId, "key-1", request)
    const error = (() => {
      try {
        createOrder(userId, "key-1", { ...request, collector: { ...request.collector, phone: "11 90000-0000" } })
      } catch (caught) {
        return caught
      }
    })()
    expect(error).toBeInstanceOf(MockApiError)
    expect(error).toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" })
    expect(db().orders).toHaveLength(1)
  })

  it("409 QUOTE_STALE quando o preço muda depois da revisão, com a cotação nova", () => {
    const request = prepareCheckout()
    mutate((data) => {
      data.nfts.find((nft) => nft.id === "golden-beat-207")!.editions.find((edition) => edition.id === "1-50")!.priceEth = "1.05"
    })
    try {
      createOrder(userId, "key-2", request)
      expect.unreachable()
    } catch (error) {
      expect(error).toMatchObject({ status: 409, code: "QUOTE_STALE" })
      expect((error as MockApiError).details).toMatchObject({ quote: { summary: { subtotalEth: "2.1" } } })
    }
    expect(db().orders).toHaveLength(0)
  })

  it("confirmação baixa o estoque, remove só os itens comprados e publica eventos", () => {
    const request = prepareCheckout()
    const { order } = createOrder(userId, "key-1", request)
    // Item adicionado depois da cotação permanece no carrinho.
    addItem({ userId }, { nftId: "emerald-ape-042", editionId: "1-50", quantity: 1 })
    const stockBefore = db().nfts.find((nft) => nft.id === "golden-beat-207")!.editions.find((edition) => edition.id === "1-50")!.available

    vi.advanceTimersByTime(ORDER_SETTLE_MS)

    const settled = getOrder(userId, order.id)
    expect(settled.status).toBe("confirmed")
    expect(settled.version).toBe(2)
    expect(settled.transaction?.hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(getCart({ userId }).items.map((item) => item.nftId)).toEqual(["emerald-ape-042"])
    const stockAfter = db().nfts.find((nft) => nft.id === "golden-beat-207")!.editions.find((edition) => edition.id === "1-50")!.available
    expect(stockAfter).toBe(stockBefore - 2)

    expect(events.map((event) => event.type)).toEqual(["order.updated", "nft.updated"])
    // Repetição depois de confirmado devolve o pedido final, sem novos efeitos.
    expect(createOrder(userId, "key-1", request).order.status).toBe("confirmed")
    expect(events).toHaveLength(2)
  })

  it("o recibo guarda o snapshot: mudanças no catálogo depois não alteram o pedido", () => {
    const request = prepareCheckout()
    const { order } = createOrder(userId, "key-1", request)
    mutate((data) => {
      data.nfts.find((nft) => nft.id === "golden-beat-207")!.editions.find((edition) => edition.id === "1-50")!.priceEth = "9.99"
    })
    vi.advanceTimersByTime(ORDER_SETTLE_MS)
    const receipt = getOrder(userId, order.id)
    expect(receipt.items[0].unitPriceEth).toBe("0.99")
    expect(receipt.summary.totalEth).toBe(order.summary.totalEth)
  })

  it("outro usuário não acessa o pedido (403)", () => {
    const { order } = createOrder(userId, "key-1", prepareCheckout())
    expect(() => getOrder("user-bruno", order.id)).toThrowError(expect.objectContaining({ status: 403 }))
  })
})
