import type { Cart, CartItem, CartItemIssue } from "@/api/types"
import { compareEth } from "@/lib/money"

import type { CartRecord, MockDatabase } from "../db/schema"
import { db, mutate } from "../db/store"
import { findNft, requireNft } from "./catalog"
import { MockApiError, notFound, validationError } from "./errors"
import { newId } from "./ids"
import { checkCoupon, computeSummary, DEFAULT_NETWORK, lineTotal, toAppliedCoupon } from "./pricing"

export type CartOwner = { userId: string } | { guestCartId: string }

function findCart(owner: CartOwner, data: MockDatabase) {
  return "userId" in owner
    ? data.carts.find((cart) => cart.userId === owner.userId)
    : data.carts.find((cart) => cart.userId === null && cart.id === owner.guestCartId)
}

function ensureCart(owner: CartOwner, data: MockDatabase): CartRecord {
  const existing = findCart(owner, data)
  if (existing) return existing
  const cart: CartRecord = {
    id: "userId" in owner ? newId("cart") : owner.guestCartId,
    userId: "userId" in owner ? owner.userId : null,
    lines: [],
    couponCode: null,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
  data.carts.push(cart)
  return cart
}

function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

export function toCartDto(cart: CartRecord, data: MockDatabase = db(), now = new Date()): Cart {
  const items: CartItem[] = []
  for (const line of cart.lines) {
    const nft = findNft(line.nftId, data)
    const edition = nft?.editions.find((entry) => entry.id === line.editionId)
    if (!nft || !edition) continue

    const issues: CartItemIssue[] = []
    if (compareEth(edition.priceEth, line.addedUnitPriceEth) !== 0) {
      issues.push({ code: "PRICE_CHANGED", previousUnitPriceEth: line.addedUnitPriceEth })
    }
    if (edition.status === "unavailable") issues.push({ code: "EDITION_UNAVAILABLE" })
    else if (edition.available === 0) issues.push({ code: "OUT_OF_STOCK" })
    else if (line.quantity > edition.available) issues.push({ code: "QUANTITY_EXCEEDS_AVAILABLE", available: edition.available })

    items.push({
      id: line.id,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      name: nft.name,
      image: nft.image,
      network: nft.network,
      unitPriceEth: edition.priceEth,
      addedUnitPriceEth: line.addedUnitPriceEth,
      quantity: line.quantity,
      lineTotalEth: lineTotal({ unitPriceEth: edition.priceEth, quantity: line.quantity }),
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      issues,
    })
  }

  const coupon = cart.couponCode ? data.coupons.find((entry) => entry.code === cart.couponCode) : undefined
  const validCoupon = coupon && checkCoupon(coupon, now) === "valid" ? toAppliedCoupon(coupon) : null

  return {
    id: cart.id,
    items,
    coupon: validCoupon,
    summary: computeSummary(items, validCoupon, DEFAULT_NETWORK),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

export function getCart(owner: CartOwner): Cart {
  return mutate((data) => toCartDto(ensureCart(owner, data), data))
}

function validateQuantity(quantity: unknown): asserts quantity is number {
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
    throw validationError({ quantity: "Informe uma quantidade inteira maior que zero." })
  }
}

export function assertEditionCapacity(nftId: string, editionId: string, quantity: number, data: MockDatabase) {
  const nft = requireNft(nftId, data)
  const edition = nft.editions.find((entry) => entry.id === editionId)
  if (!edition) throw notFound("NOT_FOUND", "Edição não encontrada.")
  if (edition.status === "unavailable") {
    throw new MockApiError(409, "EDITION_UNAVAILABLE", `A edição ${edition.label} de ${nft.name} não está à venda.`)
  }
  if (edition.available === 0 || edition.status === "sold-out") {
    throw new MockApiError(409, "OUT_OF_STOCK", `A edição ${edition.label} de ${nft.name} está esgotada.`, {
      details: { nftId, editionId, available: 0 },
    })
  }
  const limit = Math.min(edition.available, edition.maxPerOrder)
  if (quantity > limit) {
    throw new MockApiError(409, "QUANTITY_LIMIT", `Máximo de ${limit} unidade(s) para a edição ${edition.label}.`, {
      fieldErrors: { quantity: `Máximo de ${limit}` },
      details: { nftId, editionId, limit },
    })
  }
  return { nft, edition }
}

export function addItem(owner: CartOwner, body: { nftId?: unknown; editionId?: unknown; quantity?: unknown }): Cart {
  const errors: Record<string, string> = {}
  if (typeof body.nftId !== "string" || !body.nftId) errors.nftId = "NFT obrigatório."
  if (typeof body.editionId !== "string" || !body.editionId) errors.editionId = "Escolha uma edição."
  if (Object.keys(errors).length) throw validationError(errors)
  validateQuantity(body.quantity)
  const { nftId, editionId, quantity } = body as { nftId: string; editionId: string; quantity: number }

  return mutate((data) => {
    const cart = ensureCart(owner, data)
    const existing = cart.lines.find((line) => line.nftId === nftId && line.editionId === editionId)
    const { edition } = assertEditionCapacity(nftId, editionId, (existing?.quantity ?? 0) + quantity, data)
    if (existing) {
      existing.quantity += quantity
    } else {
      cart.lines.push({ id: newId("line"), nftId, editionId, quantity, addedUnitPriceEth: edition.priceEth })
    }
    touch(cart)
    return toCartDto(cart, data)
  })
}

export function updateItem(owner: CartOwner, itemId: string, body: { quantity?: unknown }): Cart {
  validateQuantity(body.quantity)
  const quantity = body.quantity
  return mutate((data) => {
    const cart = ensureCart(owner, data)
    const line = cart.lines.find((entry) => entry.id === itemId)
    if (!line) throw notFound("NOT_FOUND", "Item não está no carrinho.")
    if (quantity > line.quantity) assertEditionCapacity(line.nftId, line.editionId, quantity, data)
    line.quantity = quantity
    touch(cart)
    return toCartDto(cart, data)
  })
}

export function removeItem(owner: CartOwner, itemId: string): Cart {
  return mutate((data) => {
    const cart = ensureCart(owner, data)
    const before = cart.lines.length
    cart.lines = cart.lines.filter((line) => line.id !== itemId)
    if (cart.lines.length === before) throw notFound("NOT_FOUND", "Item não está no carrinho.")
    touch(cart)
    return toCartDto(cart, data)
  })
}

export function applyCoupon(owner: CartOwner, body: { code?: unknown }, now = new Date()): Cart {
  if (typeof body.code !== "string" || !body.code.trim()) throw validationError({ code: "Informe o cupom." })
  const code = body.code.trim().toUpperCase()
  return mutate((data) => {
    const coupon = data.coupons.find((entry) => entry.code === code)
    const validity = checkCoupon(coupon, now)
    if (validity === "invalid") {
      throw new MockApiError(400, "COUPON_INVALID", "Cupom inválido.", { fieldErrors: { code: "Cupom inválido." } })
    }
    if (validity === "expired") {
      throw new MockApiError(400, "COUPON_EXPIRED", "Este cupom expirou.", { fieldErrors: { code: "Cupom expirado." } })
    }
    const cart = ensureCart(owner, data)
    cart.couponCode = code
    touch(cart)
    return toCartDto(cart, data, now)
  })
}

export function removeCoupon(owner: CartOwner): Cart {
  return mutate((data) => {
    const cart = ensureCart(owner, data)
    cart.couponCode = null
    touch(cart)
    return toCartDto(cart, data)
  })
}

export function mergeGuestCart(guestCartId: string | undefined, userId: string) {
  if (!guestCartId) return
  mutate((data) => {
    const guest = data.carts.find((cart) => cart.userId === null && cart.id === guestCartId)
    if (!guest) return
    const target = ensureCart({ userId }, data)
    for (const line of guest.lines) {
      const nft = findNft(line.nftId, data)
      const edition = nft?.editions.find((entry) => entry.id === line.editionId)
      if (!edition) continue
      const existing = target.lines.find((entry) => entry.nftId === line.nftId && entry.editionId === line.editionId)
      const limit = Math.max(1, Math.min(edition.maxPerOrder, edition.available || line.quantity))
      if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, limit)
      else target.lines.push({ ...line, id: newId("line"), quantity: Math.min(line.quantity, limit) })
    }
    if (!target.couponCode && guest.couponCode) target.couponCode = guest.couponCode
    data.carts = data.carts.filter((cart) => cart !== guest)
    touch(target)
  })
}

export function removePurchased(userId: string, purchased: Array<{ nftId: string; editionId: string; quantity: number }>, data: MockDatabase) {
  const cart = data.carts.find((entry) => entry.userId === userId)
  if (!cart) return
  for (const item of purchased) {
    const line = cart.lines.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId)
    if (!line) continue
    line.quantity -= item.quantity
  }
  cart.lines = cart.lines.filter((line) => line.quantity > 0)
  cart.couponCode = null
  touch(cart)
}

export function userCart(userId: string, data: MockDatabase = db()) {
  return ensureCart({ userId }, data)
}
