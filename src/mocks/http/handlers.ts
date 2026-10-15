import { delay, http } from "msw"

import {
  NETWORKS,
  type ChangePasswordRequest,
  type CreateOrderRequest,
  type CreateWalletRequest,
  type FavoritesResponse,
  type LoginRequest,
  type Network,
  type OrderStatus,
  type RegisterRequest,
  type UpdateAvatarRequest,
  type UpdateProfileRequest,
  type WalletRole,
} from "@/api/types"

import type { WalletRecord } from "../db/schema"
import { db, mutate } from "../db/store"
import {
  createSession,
  EMAIL_PATTERN,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  revokeSession,
  toUser,
  verifyPassword,
} from "../domain/auth"
import { addItem, applyCoupon, getCart, mergeGuestCart, removeCoupon, removeItem, updateItem, type CartOwner } from "../domain/cart"
import { listNfts, parseListParams, requireNft, toDetail } from "../domain/catalog"
import { MockApiError, assertValid, notFound } from "../domain/errors"
import { newId } from "../domain/ids"
import { createOrder, createQuote, getOrder, listOrders } from "../domain/orders"
import { consumeOnce, getScenario } from "../scenarios"
import { api, json, noContent, readJson, route } from "./route"

const CLIENT_TIMEOUT_MS = 10_000

function cartOwner(request: Request, auth: { user: { id: string } } | null): CartOwner {
  if (auth) return { userId: auth.user.id }
  const guestCartId = request.headers.get("X-Cart-Id")
  if (!guestCartId || !/^[\w-]{8,64}$/.test(guestCartId)) {
    throw new MockApiError(400, "VALIDATION_ERROR", "Cabeçalho X-Cart-Id ausente ou inválido.")
  }
  return { guestCartId }
}

// ---------------------------------------------------------------------------
// Sessão e conta
// ---------------------------------------------------------------------------

const authHandlers = [
  http.post(
    api("/auth/register"),
    route("write", "none", async ({ request }) => {
      const body = await readJson<RegisterRequest>(request)
      const errors: Record<string, string> = {}
      if (typeof body.name !== "string" || body.name.trim().length < 3) errors.name = "Informe seu nome (mín. 3 caracteres)."
      if (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email.trim())) errors.email = "Informe um e-mail válido."
      const passwordError = passwordProblem(body.password)
      if (passwordError) errors.password = passwordError
      assertValid(errors)

      const email = normalizeEmail(body.email!)
      if (db().users.some((user) => user.email === email)) {
        throw new MockApiError(409, "EMAIL_TAKEN", "Já existe uma conta com este e-mail.", { fieldErrors: { email: "E-mail já cadastrado." } })
      }
      const passwordHash = await hashPassword(body.password!)
      const user = mutate((data) => {
        const record = {
          id: newId("user"),
          name: body.name!.trim(),
          email,
          passwordHash,
          avatarUrl: null,
          bio: "",
          createdAt: new Date().toISOString(),
        }
        data.users.push(record)
        data.favorites[record.id] = []
        return record
      })
      mergeGuestCart(body.guestCartId, user.id)
      return json(createSession(user.id), 201)
    }),
  ),

  http.post(
    api("/auth/login"),
    route("write", "none", async ({ request }) => {
      const body = await readJson<LoginRequest>(request)
      const errors: Record<string, string> = {}
      if (typeof body.email !== "string" || !body.email.trim()) errors.email = "Informe o e-mail."
      if (typeof body.password !== "string" || !body.password) errors.password = "Informe a senha."
      assertValid(errors)

      const user = db().users.find((entry) => entry.email === normalizeEmail(body.email!))
      // Mesmo custo de verificação para e-mail inexistente (evita enumeração por tempo).
      const valid = await verifyPassword(body.password!, user?.passwordHash ?? "pbkdf2$100000$00$00")
      if (!user || !valid) throw new MockApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.")
      mergeGuestCart(body.guestCartId, user.id)
      return json(createSession(user.id))
    }),
  ),

  http.get(
    api("/auth/session"),
    route("read", "required", ({ auth }) => json({ token: auth.token, expiresAt: auth.expiresAt, user: toUser(auth.user) })),
  ),

  http.post(
    api("/auth/logout"),
    route("write", "optional", ({ auth }) => {
      if (auth) revokeSession(auth.token)
      return noContent()
    }),
  ),
]

// ---------------------------------------------------------------------------
// NFTs e favoritos
// ---------------------------------------------------------------------------

const catalogHandlers = [
  http.get(
    api("/nfts"),
    route("catalog", "none", ({ url }) => {
      const params = parseListParams(url.searchParams)
      const page = listNfts(params)
      if (getScenario() === "empty") return json({ ...page, items: [], total: 0, totalPages: 1 })
      return json(page)
    }),
  ),

  http.get<{ id: string }>(
    api("/nfts/:id"),
    route("catalog", "none", ({ params }) => json(toDetail(requireNft(params.id)))),
  ),

  http.get(
    api("/favorites"),
    route("read", "required", ({ auth }) => json<FavoritesResponse>({ nftIds: db().favorites[auth.user.id] ?? [] })),
  ),

  http.put<{ nftId: string }>(
    api("/favorites/:nftId"),
    route("write", "required", ({ auth, params }) => {
      requireNft(params.nftId)
      mutate((data) => {
        const list = (data.favorites[auth.user.id] ??= [])
        if (!list.includes(params.nftId)) list.push(params.nftId)
      })
      return noContent()
    }),
  ),

  http.delete<{ nftId: string }>(
    api("/favorites/:nftId"),
    route("write", "required", ({ auth, params }) => {
      mutate((data) => {
        data.favorites[auth.user.id] = (data.favorites[auth.user.id] ?? []).filter((id) => id !== params.nftId)
      })
      return noContent()
    }),
  ),
]

// ---------------------------------------------------------------------------
// Carrinho, cotação e pedidos
// ---------------------------------------------------------------------------

const cartHandlers = [
  http.get(api("/cart"), route("read", "optional", ({ request, auth }) => json(getCart(cartOwner(request, auth))))),

  http.post(
    api("/cart/items"),
    route("write", "optional", async ({ request, auth }) => json(addItem(cartOwner(request, auth), await readJson(request)))),
  ),

  http.patch<{ itemId: string }>(
    api("/cart/items/:itemId"),
    route("write", "optional", async ({ request, auth, params }) =>
      json(updateItem(cartOwner(request, auth), params.itemId, await readJson(request))),
    ),
  ),

  http.delete<{ itemId: string }>(
    api("/cart/items/:itemId"),
    route("write", "optional", ({ request, auth, params }) => json(removeItem(cartOwner(request, auth), params.itemId))),
  ),

  http.put(
    api("/cart/coupon"),
    route("write", "optional", async ({ request, auth }) => json(applyCoupon(cartOwner(request, auth), await readJson(request)))),
  ),

  http.delete(api("/cart/coupon"), route("write", "optional", ({ request, auth }) => json(removeCoupon(cartOwner(request, auth))))),

  http.post(
    api("/quotes"),
    route("write", "required", async ({ request, auth }) => json(createQuote(auth.user.id, await readJson(request)), 201)),
  ),

  http.post(
    api("/orders"),
    route("write", "required", async ({ request, auth }) => {
      const key = request.headers.get("Idempotency-Key")
      const { order, replayed } = createOrder(auth.user.id, key, await readJson<CreateOrderRequest>(request))
      // Cenário order-timeout: o pedido foi criado, mas a primeira resposta não chega a tempo.
      if (!replayed && getScenario() === "order-timeout" && consumeOnce(`order-timeout:${key}`)) {
        await delay(CLIENT_TIMEOUT_MS + 5_000)
      }
      return json(order, replayed ? 200 : 201)
    }),
  ),

  http.get(
    api("/orders"),
    route("read", "required", ({ auth, url }) => {
      const status = url.searchParams.get("status") as OrderStatus | null
      return json({ items: listOrders(auth.user.id, status ?? undefined) })
    }),
  ),

  http.get<{ id: string }>(api("/orders/:id"), route("read", "required", ({ auth, params }) => json(getOrder(auth.user.id, params.id)))),
]

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const AVATAR_MAX_BYTES = 1024 * 1024

const profileHandlers = [
  http.get(api("/profile"), route("read", "required", ({ auth }) => json(toUser(auth.user)))),

  http.patch(
    api("/profile"),
    route("write", "required", async ({ request, auth }) => {
      const body = await readJson<UpdateProfileRequest>(request)
      const errors: Record<string, string> = {}
      if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length < 3)) errors.name = "Informe seu nome (mín. 3 caracteres)."
      if (body.email !== undefined && (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email.trim()))) errors.email = "Informe um e-mail válido."
      if (body.bio !== undefined && (typeof body.bio !== "string" || body.bio.length > 280)) errors.bio = "Use até 280 caracteres."
      assertValid(errors)

      const email = body.email ? normalizeEmail(body.email) : undefined
      if (email && db().users.some((user) => user.email === email && user.id !== auth.user.id)) {
        throw new MockApiError(409, "EMAIL_TAKEN", "Este e-mail já está em uso.", { fieldErrors: { email: "E-mail já cadastrado." } })
      }
      const user = mutate((data) => {
        const record = data.users.find((entry) => entry.id === auth.user.id)!
        if (body.name !== undefined) record.name = body.name.trim()
        if (email) record.email = email
        if (body.bio !== undefined) record.bio = body.bio.trim()
        return record
      })
      return json(toUser(user))
    }),
  ),

  http.put(
    api("/profile/avatar"),
    route("write", "required", async ({ request, auth }) => {
      const { dataUrl } = await readJson<UpdateAvatarRequest>(request)
      if (typeof dataUrl !== "string" || !AVATAR_PATTERN.test(dataUrl)) {
        throw new MockApiError(400, "AVATAR_INVALID", "Envie uma imagem PNG, JPEG ou WebP.", { fieldErrors: { avatar: "Formato não suportado." } })
      }
      const bytes = Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75)
      if (bytes > AVATAR_MAX_BYTES) {
        throw new MockApiError(400, "AVATAR_INVALID", "A imagem deve ter até 1 MB.", { fieldErrors: { avatar: "Imagem acima de 1 MB." } })
      }
      const user = mutate((data) => {
        const record = data.users.find((entry) => entry.id === auth.user.id)!
        record.avatarUrl = dataUrl
        return record
      })
      return json(toUser(user))
    }),
  ),

  http.post(
    api("/profile/password"),
    route("write", "required", async ({ request, auth }) => {
      const body = await readJson<ChangePasswordRequest>(request)
      const errors: Record<string, string> = {}
      if (typeof body.currentPassword !== "string" || !body.currentPassword) errors.currentPassword = "Informe a senha atual."
      const problem = passwordProblem(body.newPassword)
      if (problem) errors.newPassword = problem
      else if (body.newPassword === body.currentPassword) errors.newPassword = "A nova senha deve ser diferente da atual."
      assertValid(errors)

      if (!(await verifyPassword(body.currentPassword!, auth.user.passwordHash))) {
        throw new MockApiError(400, "INVALID_CURRENT_PASSWORD", "Senha atual incorreta.", {
          fieldErrors: { currentPassword: "Senha atual incorreta." },
        })
      }
      const passwordHash = await hashPassword(body.newPassword!)
      mutate((data) => {
        data.users.find((entry) => entry.id === auth.user.id)!.passwordHash = passwordHash
      })
      return noContent()
    }),
  ),
]

// ---------------------------------------------------------------------------
// Carteiras
// ---------------------------------------------------------------------------

const ROLES: readonly WalletRole[] = ["primary", "secondary"]
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function validateWallet(body: Partial<CreateWalletRequest>, partial: boolean) {
  const errors: Record<string, string> = {}
  const has = (key: keyof CreateWalletRequest) => !partial || body[key] !== undefined
  if (has("label") && (typeof body.label !== "string" || body.label.trim().length < 2)) errors.label = "Dê um nome à carteira."
  if (has("network") && !NETWORKS.includes(body.network as Network)) errors.network = "Escolha uma rede."
  if (has("role") && !ROLES.includes(body.role as WalletRole)) errors.role = "Escolha principal ou secundária."
  if (has("address")) {
    const network = body.network
    const address = typeof body.address === "string" ? body.address.trim() : ""
    const valid = network === "solana" ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
    if (!valid) errors.address = network === "solana" ? "Endereço Solana inválido." : "Endereço inválido (0x + 40 caracteres hexadecimais)."
  }
  return errors
}

function toWallet({ userId: _userId, ...wallet }: WalletRecord) {
  return wallet
}

function requireWallet(userId: string, id: string) {
  const wallet = db().wallets.find((entry) => entry.id === id)
  if (!wallet) throw notFound("NOT_FOUND", "Carteira não encontrada.")
  if (wallet.userId !== userId) throw new MockApiError(403, "FORBIDDEN", "Esta carteira pertence a outra conta.")
  return wallet
}

function assertWalletConflicts(userId: string, candidate: Pick<WalletRecord, "role" | "address">, ignoreId?: string) {
  const own = db().wallets.filter((entry) => entry.userId === userId && entry.id !== ignoreId)
  if (own.some((entry) => entry.role === candidate.role)) {
    const label = candidate.role === "primary" ? "principal" : "secundária"
    throw new MockApiError(409, "WALLET_ROLE_TAKEN", `Você já tem uma carteira ${label}.`, { fieldErrors: { role: `Já existe uma carteira ${label}.` } })
  }
  if (own.some((entry) => entry.address.toLowerCase() === candidate.address.toLowerCase())) {
    throw new MockApiError(409, "WALLET_DUPLICATE", "Este endereço já está cadastrado.", { fieldErrors: { address: "Endereço já cadastrado." } })
  }
}

const walletHandlers = [
  http.get(
    api("/wallets"),
    route("read", "required", ({ auth }) =>
      json({ items: db().wallets.filter((wallet) => wallet.userId === auth.user.id).map(toWallet) }),
    ),
  ),

  http.post(
    api("/wallets"),
    route("write", "required", async ({ request, auth }) => {
      const body = await readJson<CreateWalletRequest>(request)
      assertValid(validateWallet(body, false))
      const input = body as CreateWalletRequest
      assertWalletConflicts(auth.user.id, input)
      const wallet = mutate((data) => {
        const now = new Date().toISOString()
        const record: WalletRecord = {
          id: newId("wallet"),
          userId: auth.user.id,
          label: input.label.trim(),
          address: input.address.trim(),
          network: input.network,
          role: input.role,
          connection: "disconnected",
          createdAt: now,
          updatedAt: now,
        }
        data.wallets.push(record)
        return record
      })
      return json(toWallet(wallet), 201)
    }),
  ),

  http.patch<{ id: string }>(
    api("/wallets/:id"),
    route("write", "required", async ({ request, auth, params }) => {
      const current = requireWallet(auth.user.id, params.id)
      const body = await readJson<CreateWalletRequest>(request)
      const merged = { ...current, ...body }
      // Endereço é revalidado quando ele ou a rede mudam.
      const errors = validateWallet(
        { ...body, network: merged.network, address: body.address ?? (body.network ? current.address : undefined) },
        true,
      )
      assertValid(errors)
      assertWalletConflicts(auth.user.id, { role: merged.role, address: merged.address }, current.id)
      const wallet = mutate((data) => {
        const record = data.wallets.find((entry) => entry.id === current.id)!
        if (body.label !== undefined) record.label = body.label.trim()
        if (body.address !== undefined) record.address = body.address.trim()
        if (body.network !== undefined) record.network = body.network
        if (body.role !== undefined) record.role = body.role
        if (body.address !== undefined || body.network !== undefined) record.connection = "disconnected"
        record.updatedAt = new Date().toISOString()
        return record
      })
      return json(toWallet(wallet))
    }),
  ),

  http.post<{ id: string }>(
    api("/wallets/:id/connect"),
    route("write", "required", ({ auth, params }) => {
      const current = requireWallet(auth.user.id, params.id)
      if (getScenario() === "wallet-rejected") {
        throw new MockApiError(403, "WALLET_REJECTED", "A conexão foi recusada na carteira.")
      }
      const wallet = mutate((data) => {
        const record = data.wallets.find((entry) => entry.id === current.id)!
        record.connection = "connected"
        record.updatedAt = new Date().toISOString()
        return record
      })
      return json(toWallet(wallet))
    }),
  ),

  http.post<{ id: string }>(
    api("/wallets/:id/disconnect"),
    route("write", "required", ({ auth, params }) => {
      const current = requireWallet(auth.user.id, params.id)
      const wallet = mutate((data) => {
        const record = data.wallets.find((entry) => entry.id === current.id)!
        record.connection = "disconnected"
        record.updatedAt = new Date().toISOString()
        return record
      })
      return json(toWallet(wallet))
    }),
  ),
]

export const httpHandlers = [...authHandlers, ...catalogHandlers, ...cartHandlers, ...profileHandlers, ...walletHandlers]
