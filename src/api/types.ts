/**
 * Contratos tipados entre transporte (REST/Socket.IO), estado e interface.
 * Comportamento e regras: docs/design.md. Os mocks (src/mocks) implementam estes tipos.
 */

/** Valor em ETH como string decimal (ex.: "1.19", "0.0021"). Nunca `number`. */
export type EthAmount = string
/** Data ISO-8601 em UTC. */
export type IsoDateTime = string

export type Network = "ethereum" | "polygon" | "solana"
export const NETWORKS: readonly Network[] = ["ethereum", "polygon", "solana"]

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  // 400
  | "VALIDATION_ERROR"
  | "COUPON_INVALID"
  | "COUPON_EXPIRED"
  | "CART_EMPTY"
  | "INVALID_CURRENT_PASSWORD"
  | "AVATAR_INVALID"
  | "IDEMPOTENCY_KEY_REQUIRED"
  // 401
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "INVALID_CREDENTIALS"
  // 403
  | "FORBIDDEN"
  | "WALLET_REJECTED"
  // 404
  | "NOT_FOUND"
  | "NFT_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "QUOTE_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  // 409
  | "EMAIL_TAKEN"
  | "OUT_OF_STOCK"
  | "EDITION_UNAVAILABLE"
  | "QUANTITY_LIMIT"
  | "QUOTE_STALE"
  | "QUOTE_EXPIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "WALLET_ROLE_TAKEN"
  | "WALLET_DUPLICATE"
  | "WALLET_NOT_CONNECTED"
  // 5xx
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"

/** Códigos gerados no cliente quando não há resposta HTTP utilizável. */
export type ClientErrorCode = "NETWORK_ERROR" | "TIMEOUT" | "CANCELED" | "UNKNOWN"

export type FieldErrors = Record<string, string>

export interface ApiErrorPayload {
  code: ApiErrorCode
  message: string
  status: number
  retryable: boolean
  fieldErrors?: FieldErrors
  details?: unknown
}

export interface ApiErrorBody {
  error: ApiErrorPayload
}

// ---------------------------------------------------------------------------
// Sessão e conta
// ---------------------------------------------------------------------------

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  bio: string
  createdAt: IsoDateTime
}

export interface SessionResponse {
  token: string
  expiresAt: IsoDateTime
  user: User
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  guestCartId?: string
}

export interface LoginRequest {
  email: string
  password: string
  guestCartId?: string
}

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------

export type NftSort = "recent" | "price-asc" | "price-desc" | "name-asc"
export const NFT_SORTS: readonly NftSort[] = ["recent", "price-asc", "price-desc", "name-asc"]

export type CatalogTab = "all" | "new" | "trending"
export const CATALOG_TABS: readonly CatalogTab[] = ["all", "new", "trending"]

export interface NftListParams {
  q?: string
  collections?: string[]
  networks?: Network[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  sort?: NftSort
  tab?: CatalogTab
  page?: number
  pageSize?: number
}

export interface CollectionRef {
  id: string
  name: string
}

export interface NftSummary {
  id: string
  name: string
  image: string
  collection: CollectionRef
  network: Network
  /** Menor preço entre as edições à venda. */
  priceEth: EthAmount
  previousPriceEth: EthAmount | null
  badge: string | null
  /** Total disponível somando as edições à venda. */
  available: number
  version: number
  createdAt: IsoDateTime
}

export type EditionStatus = "available" | "sold-out" | "unavailable"

export interface Edition {
  id: string
  label: string
  /** `null` = edição aberta (sem limite de tiragem). */
  supply: number | null
  available: number
  priceEth: EthAmount
  maxPerOrder: number
  status: EditionStatus
}

export interface NftDetail extends NftSummary {
  description: string
  story: string[]
  tokenId: string
  contract: string
  royaltyPercent: number
  attributes: string[]
  rating: { average: number; count: number }
  gallery: string[]
  creator: string
  editions: Edition[]
}

export interface Facet {
  id: string
  label: string
  count: number
}

export interface NftPage {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: {
    collections: Facet[]
    networks: Facet[]
    priceRange: { min: EthAmount; max: EthAmount }
  }
}

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------

export interface FavoritesResponse {
  nftIds: string[]
}

// ---------------------------------------------------------------------------
// Carrinho e cotação
// ---------------------------------------------------------------------------

export interface PriceSummary {
  subtotalEth: EthAmount
  discountEth: EthAmount
  networkFeeEth: EthAmount
  totalEth: EthAmount
}

export type CouponKind = "percent" | "fixed"

export interface AppliedCoupon {
  code: string
  description: string
  kind: CouponKind
  /** Percentual (ex.: "10") ou valor fixo em ETH. */
  value: string
}

export type CartItemIssue =
  | { code: "PRICE_CHANGED"; previousUnitPriceEth: EthAmount }
  | { code: "OUT_OF_STOCK" }
  | { code: "QUANTITY_EXCEEDS_AVAILABLE"; available: number }
  | { code: "EDITION_UNAVAILABLE" }

export interface CartItem {
  id: string
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  image: string
  network: Network
  unitPriceEth: EthAmount
  addedUnitPriceEth: EthAmount
  quantity: number
  lineTotalEth: EthAmount
  available: number
  maxPerOrder: number
  issues: CartItemIssue[]
}

export interface Cart {
  id: string
  items: CartItem[]
  coupon: AppliedCoupon | null
  summary: PriceSummary
  version: number
  updatedAt: IsoDateTime
}

export interface AddCartItemRequest {
  nftId: string
  editionId: string
  quantity: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

export interface ApplyCouponRequest {
  code: string
}

export interface CreateQuoteRequest {
  network: Network
}

export interface QuoteItem {
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  image: string
  unitPriceEth: EthAmount
  quantity: number
  lineTotalEth: EthAmount
}

export interface Quote {
  id: string
  cartVersion: number
  network: Network
  items: QuoteItem[]
  coupon: AppliedCoupon | null
  summary: PriceSummary
  createdAt: IsoDateTime
  expiresAt: IsoDateTime
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export type OrderStatus = "pending" | "confirmed" | "rejected"
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ["confirmed", "rejected"]

export interface CollectorDetails {
  fullName: string
  email: string
  phone: string
  country: string
}

export interface CreateOrderRequest {
  quoteId: string
  walletId: string
  network: Network
  collector: CollectorDetails
}

export interface OrderTransaction {
  hash: string
  explorerUrl: string
}

export interface Order {
  id: string
  number: string
  status: OrderStatus
  version: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  quoteId: string
  network: Network
  wallet: { id: string; label: string; address: string }
  collector: CollectorDetails
  /** Snapshot no momento da criação: não muda com o catálogo. */
  items: QuoteItem[]
  coupon: AppliedCoupon | null
  summary: PriceSummary
  transaction: OrderTransaction | null
  failureReason: string | null
}

export interface OrderListResponse {
  items: Order[]
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export type Profile = User

export interface UpdateProfileRequest {
  name?: string
  email?: string
  bio?: string
}

export interface UpdateAvatarRequest {
  /** data:image/(png|jpeg|webp);base64,... — até 1 MB. */
  dataUrl: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---------------------------------------------------------------------------
// Carteiras
// ---------------------------------------------------------------------------

export type WalletRole = "primary" | "secondary"
export type WalletConnection = "connected" | "disconnected"

export interface Wallet {
  id: string
  label: string
  address: string
  network: Network
  role: WalletRole
  connection: WalletConnection
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface WalletListResponse {
  items: Wallet[]
}

export interface CreateWalletRequest {
  label: string
  address: string
  network: Network
  role: WalletRole
}

export type UpdateWalletRequest = Partial<CreateWalletRequest>

// ---------------------------------------------------------------------------
// Tempo real (Socket.IO)
// ---------------------------------------------------------------------------

export interface RealtimeEvent<TType extends string, TResource extends string, TData> {
  /** Identidade estável: duplicatas compartilham o mesmo eventId. */
  eventId: string
  type: TType
  resource: { type: TResource; id: string }
  /** Versão do recurso após a mudança. */
  version: number
  occurredAt: IsoDateTime
  data: TData
}

export interface NftUpdatedData {
  priceEth: EthAmount
  previousPriceEth: EthAmount | null
  available: number
  editions: Array<Pick<Edition, "id" | "priceEth" | "available" | "status">>
}

export interface OrderUpdatedData {
  userId: string
  status: OrderStatus
  previousStatus: OrderStatus
  transaction: OrderTransaction | null
  failureReason: string | null
}

export type NftUpdatedEvent = RealtimeEvent<"nft.updated", "nft", NftUpdatedData>
export type OrderUpdatedEvent = RealtimeEvent<"order.updated", "order", OrderUpdatedData>
export type AnyRealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

export interface ServerToClientEvents {
  "nft.updated": (event: NftUpdatedEvent) => void
  "order.updated": (event: OrderUpdatedEvent) => void
}

/** O cliente não emite eventos: apenas escuta. */
export type ClientToServerEvents = Record<string, never>

export interface SocketAuth {
  token?: string
}
