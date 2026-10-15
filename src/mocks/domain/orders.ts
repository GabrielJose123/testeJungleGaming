import {
  NETWORKS,
  type CollectorDetails,
  type CreateOrderRequest,
  type Network,
  type Order,
  type OrderStatus,
  type OrderUpdatedEvent,
  type Quote,
  type QuoteItem,
} from "@/api/types"
import { compareEth, eth, toEthAmount } from "@/lib/money"

import type { MockDatabase, OrderRecord, QuoteRecord } from "../db/schema"
import { db, mutate } from "../db/store"
import { publish } from "../events"
import { consumeOnce, getScenario } from "../scenarios"
import { EMAIL_PATTERN } from "./auth"
import { removePurchased, toCartDto, userCart } from "./cart"
import { findNft, updateNft } from "./catalog"
import { MockApiError, assertValid, notFound } from "./errors"
import { hashPayload, resolveIdempotency } from "./idempotency"
import { newId, randomHex } from "./ids"
import { checkCoupon, computeSummary, lineTotal } from "./pricing"

export const QUOTE_TTL_MS = 5 * 60 * 1000
export const ORDER_SETTLE_MS = 2500

function isNetwork(value: unknown): value is Network {
  return typeof value === "string" && NETWORKS.includes(value as Network)
}

export function priceCart(userId: string, network: Network, data: MockDatabase, now = new Date()) {
  const cart = userCart(userId, data)
  const dto = toCartDto(cart, data, now)
  if (dto.items.length === 0) throw new MockApiError(400, "CART_EMPTY", "Seu carrinho está vazio.")

  const blocked = dto.items.filter((item) => item.issues.some((issue) => issue.code !== "PRICE_CHANGED"))
  if (blocked.length > 0) {
    const reason = blocked[0].issues.find((issue) => issue.code !== "PRICE_CHANGED")!
    const code = reason.code === "QUANTITY_EXCEEDS_AVAILABLE" ? "QUANTITY_LIMIT" : reason.code === "EDITION_UNAVAILABLE" ? "EDITION_UNAVAILABLE" : "OUT_OF_STOCK"
    throw new MockApiError(409, code, `${blocked[0].name} (${blocked[0].editionLabel}) não está disponível na quantidade escolhida.`, {
      details: { items: blocked.map(({ id, nftId, editionId, available, issues }) => ({ id, nftId, editionId, available, issues })) },
    })
  }

  if (cart.couponCode) {
    const coupon = data.coupons.find((entry) => entry.code === cart.couponCode)
    if (checkCoupon(coupon, now) === "expired") throw new MockApiError(400, "COUPON_EXPIRED", "O cupom aplicado expirou.")
  }

  const items: QuoteItem[] = dto.items.map((item) => ({
    nftId: item.nftId,
    editionId: item.editionId,
    editionLabel: item.editionLabel,
    name: item.name,
    image: item.image,
    unitPriceEth: item.unitPriceEth,
    quantity: item.quantity,
    lineTotalEth: lineTotal(item),
  }))

  return { cart, items, coupon: dto.coupon, summary: computeSummary(items, dto.coupon, network) }
}

export function createQuote(userId: string, body: { network?: unknown }, now = new Date()): Quote {
  if (!isNetwork(body.network)) throw new MockApiError(400, "VALIDATION_ERROR", "Rede inválida.", { fieldErrors: { network: "Escolha uma rede." } })
  const network = body.network
  return mutate((data) => {
    const priced = priceCart(userId, network, data, now)
    const quote: QuoteRecord = {
      id: newId("quote"),
      userId,
      couponCode: priced.cart.couponCode,
      cartVersion: priced.cart.version,
      network,
      items: priced.items,
      coupon: priced.coupon,
      summary: priced.summary,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
    }
    data.quotes = data.quotes.filter((entry) => entry.userId !== userId || new Date(entry.expiresAt) > now)
    data.quotes.push(quote)
    return toQuote(quote)
  })
}

function toQuote({ userId: _userId, couponCode: _couponCode, ...quote }: QuoteRecord): Quote {
  return quote
}

function sameQuote(a: Pick<Quote, "items" | "summary">, b: Pick<Quote, "items" | "summary">) {
  if (a.items.length !== b.items.length) return false
  const sameItems = a.items.every((item, index) => {
    const other = b.items[index]
    return (
      item.nftId === other.nftId &&
      item.editionId === other.editionId &&
      item.quantity === other.quantity &&
      compareEth(item.unitPriceEth, other.unitPriceEth) === 0
    )
  })
  return (
    sameItems &&
    compareEth(a.summary.discountEth, b.summary.discountEth) === 0 &&
    compareEth(a.summary.networkFeeEth, b.summary.networkFeeEth) === 0 &&
    compareEth(a.summary.totalEth, b.summary.totalEth) === 0
  )
}

function validateCollector(collector: Partial<CollectorDetails> | undefined) {
  const errors: Record<string, string> = {}
  if (!collector || typeof collector.fullName !== "string" || collector.fullName.trim().length < 3) {
    errors["collector.fullName"] = "Informe o nome completo."
  }
  if (!collector || typeof collector.email !== "string" || !EMAIL_PATTERN.test(collector.email)) {
    errors["collector.email"] = "Informe um e-mail válido."
  }
  if (!collector || typeof collector.phone !== "string" || collector.phone.replace(/\D/g, "").length < 10) {
    errors["collector.phone"] = "Informe um telefone com DDD."
  }
  if (!collector || typeof collector.country !== "string" || !collector.country.trim()) {
    errors["collector.country"] = "Informe o país."
  }
  return errors
}

function toOrder({ userId: _u, outcome: _o, settleAt: _s, purchasedLines: _p, ...order }: OrderRecord): Order {
  return order
}

function applyPurchaseScenario(quote: QuoteRecord) {
  const scenario = getScenario()
  const first = quote.items[0]
  if (!first) return
  if (scenario === "price-changed" && consumeOnce("price-changed")) {
    const raised = toEthAmount(eth(first.unitPriceEth).times("1.1").toDecimalPlaces(6))
    updateNft(first.nftId, { editionId: first.editionId, priceEth: raised })
  }
  if (scenario === "sold-out" && consumeOnce("sold-out")) {
    updateNft(first.nftId, { editionId: first.editionId, available: 0 })
  }
}

export type CreateOrderResult = { order: Order; replayed: boolean }

export function createOrder(userId: string, idempotencyKey: string | null, body: Partial<CreateOrderRequest>, now = new Date()): CreateOrderResult {
  if (!idempotencyKey) {
    throw new MockApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "O cabeçalho Idempotency-Key é obrigatório.")
  }

  const errors: Record<string, string> = validateCollector(body.collector)
  if (typeof body.quoteId !== "string" || !body.quoteId) errors.quoteId = "Cotação obrigatória."
  if (typeof body.walletId !== "string" || !body.walletId) errors.walletId = "Escolha uma carteira."
  if (!isNetwork(body.network)) errors.network = "Escolha uma rede."
  assertValid(errors)
  const request = body as CreateOrderRequest

  const payloadHash = hashPayload(request)
  const data = db()

  const decision = resolveIdempotency(data.idempotency, userId, idempotencyKey, payloadHash)
  if (decision.kind === "replay") {
    const existing = data.orders.find((order) => order.id === decision.orderId)!
    return { order: toOrder(settleIfDue(existing)), replayed: true }
  }
  if (decision.kind === "conflict") {
    throw new MockApiError(409, "IDEMPOTENCY_CONFLICT", "Esta chave de idempotência já foi usada com outro conteúdo.", {
      details: { orderId: decision.orderId },
    })
  }

  const quote = data.quotes.find((entry) => entry.id === request.quoteId && entry.userId === userId)
  if (!quote) throw notFound("QUOTE_NOT_FOUND", "Cotação não encontrada. Gere uma nova revisão.")
  if (new Date(quote.expiresAt).getTime() <= now.getTime()) {
    throw new MockApiError(409, "QUOTE_EXPIRED", "A cotação expirou. Revise os valores novamente.")
  }
  if (request.network !== quote.network) {
    throw new MockApiError(400, "VALIDATION_ERROR", "A rede difere da cotação.", { fieldErrors: { network: "Gere a cotação para esta rede." } })
  }
  const wallet = data.wallets.find((entry) => entry.id === request.walletId && entry.userId === userId)
  if (!wallet) throw notFound("NOT_FOUND", "Carteira não encontrada.")
  if (wallet.connection !== "connected") {
    throw new MockApiError(409, "WALLET_NOT_CONNECTED", "Conecte a carteira antes de confirmar o pedido.")
  }

  applyPurchaseScenario(quote)
  const current = priceCart(userId, quote.network, db(), now)
  if (!sameQuote(quote, current)) {
    const fresh = createQuote(userId, { network: quote.network }, now)
    throw new MockApiError(409, "QUOTE_STALE", "Os valores mudaram desde a revisão. Confira e confirme novamente.", {
      details: { quote: fresh },
    })
  }

  return mutate((store) => {
    store.orderSequence += 1
    const record: OrderRecord = {
      id: newId("order"),
      number: `KR-${String(store.orderSequence).padStart(6, "0")}`,
      status: "pending",
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      quoteId: quote.id,
      network: quote.network,
      wallet: { id: wallet.id, label: wallet.label, address: wallet.address },
      collector: request.collector,
      items: structuredClone(quote.items),
      coupon: quote.coupon ? structuredClone(quote.coupon) : null,
      summary: structuredClone(quote.summary),
      transaction: null,
      failureReason: null,
      userId,
      outcome: getScenario() === "payment-declined" ? "reject" : "confirm",
      settleAt: new Date(now.getTime() + ORDER_SETTLE_MS).toISOString(),
      purchasedLines: quote.items.map(({ nftId, editionId, quantity }) => ({ nftId, editionId, quantity })),
    }
    store.orders.push(record)
    store.idempotency.push({ key: idempotencyKey, userId, payloadHash, orderId: record.id })
    scheduleSettlement(record)
    return { order: toOrder(record), replayed: false }
  })
}

export function getOrder(userId: string, orderId: string): Order {
  const order = db().orders.find((entry) => entry.id === orderId)
  if (!order) throw notFound("ORDER_NOT_FOUND", "Pedido não encontrado.")
  if (order.userId !== userId) throw new MockApiError(403, "FORBIDDEN", "Este pedido pertence a outra conta.")
  return toOrder(settleIfDue(order))
}

export function listOrders(userId: string, status?: OrderStatus): Order[] {
  return db()
    .orders.filter((order) => order.userId === userId)
    .map((order) => settleIfDue(order))
    .filter((order) => !status || order.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toOrder)
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleSettlement(order: OrderRecord) {
  if (order.status !== "pending" || timers.has(order.id)) return
  const wait = Math.max(0, new Date(order.settleAt).getTime() - Date.now())
  timers.set(
    order.id,
    setTimeout(() => {
      timers.delete(order.id)
      const current = db().orders.find((entry) => entry.id === order.id)
      if (current) settleIfDue(current)
    }, wait),
  )
}

export function resumePendingOrders() {
  for (const order of db().orders) {
    if (order.status === "pending") {
      if (new Date(order.settleAt).getTime() <= Date.now()) settleIfDue(order)
      else scheduleSettlement(order)
    }
  }
}

function settleIfDue(order: OrderRecord, now = new Date()): OrderRecord {
  if (order.status !== "pending" || new Date(order.settleAt).getTime() > now.getTime()) return order

  const stockChanges: Array<{ nftId: string; editionId: string; available: number }> = []
  const settled = mutate((data) => {
    const record = data.orders.find((entry) => entry.id === order.id)!
    if (record.status !== "pending") return record
    const previousStatus: OrderStatus = record.status
    let outcome = record.outcome

    if (outcome === "confirm") {
      const shortage = record.purchasedLines.some((line) => {
        const edition = findNft(line.nftId, data)?.editions.find((entry) => entry.id === line.editionId)
        return !edition || edition.available < line.quantity
      })
      if (shortage) outcome = "reject"
      else {
        for (const line of record.purchasedLines) {
          const edition = findNft(line.nftId, data)!.editions.find((entry) => entry.id === line.editionId)!
          stockChanges.push({ nftId: line.nftId, editionId: line.editionId, available: edition.available - line.quantity })
        }
        removePurchased(record.userId, record.purchasedLines, data)
      }
    }

    record.status = outcome === "confirm" ? "confirmed" : "rejected"
    record.version += 1
    record.updatedAt = now.toISOString()
    if (record.status === "confirmed") {
      const hash = `0x${randomHex(32)}`
      record.transaction = { hash, explorerUrl: `https://explorer.kurio.example/${record.network}/tx/${hash}` }
    } else {
      record.failureReason = record.outcome === "reject" ? "Pagamento recusado pela carteira (simulação)." : "Uma das edições esgotou antes da confirmação."
    }

    const event: OrderUpdatedEvent = {
      eventId: newId("evt"),
      type: "order.updated",
      resource: { type: "order", id: record.id },
      version: record.version,
      occurredAt: now.toISOString(),
      data: {
        userId: record.userId,
        status: record.status,
        previousStatus,
        transaction: record.transaction,
        failureReason: record.failureReason,
      },
    }
    publish(event)
    return record
  })

  for (const change of stockChanges) updateNft(change.nftId, { editionId: change.editionId, available: change.available })
  return settled
}
