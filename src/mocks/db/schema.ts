import type {
  AppliedCoupon,
  CollectorDetails,
  CouponKind,
  Edition,
  EthAmount,
  IsoDateTime,
  Network,
  Order,
  Quote,
  Wallet,
} from "@/api/types"

/** Registros internos do servidor simulado (não são expostos diretamente). */

export interface NftRecord {
  id: string
  name: string
  image: string
  collectionId: string
  network: Network
  previousPriceEth: EthAmount | null
  badge: string | null
  createdAt: IsoDateTime
  trendingScore: number
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
  version: number
}

export interface CollectionRecord {
  id: string
  name: string
}

export interface UserRecord {
  id: string
  name: string
  email: string
  /** `pbkdf2$<iterações>$<saltHex>$<hashHex>` — nunca a senha em claro. */
  passwordHash: string
  avatarUrl: string | null
  bio: string
  createdAt: IsoDateTime
}

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: IsoDateTime
}

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedUnitPriceEth: EthAmount
}

export interface CartRecord {
  id: string
  /** `null` = carrinho de visitante (identificado por `X-Cart-Id`). */
  userId: string | null
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
  updatedAt: IsoDateTime
}

export interface CouponRecord {
  code: string
  description: string
  kind: CouponKind
  value: string
  expiresAt: IsoDateTime
}

export interface QuoteRecord extends Quote {
  userId: string
  couponCode: string | null
}

export type OrderOutcome = "confirm" | "reject"

export interface OrderRecord extends Order {
  userId: string
  /** Resultado decidido na criação (cenário ativo naquele momento). */
  outcome: OrderOutcome
  /** Momento em que o pedido sai de `pending`. */
  settleAt: IsoDateTime
  /** Quantidades compradas por linha de carrinho, para removê-las na confirmação. */
  purchasedLines: Array<{ nftId: string; editionId: string; quantity: number }>
}

export interface IdempotencyRecord {
  key: string
  userId: string
  payloadHash: string
  orderId: string
}

export interface WalletRecord extends Wallet {
  userId: string
}

export interface MockDatabase {
  schemaVersion: number
  collections: CollectionRecord[]
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  carts: CartRecord[]
  coupons: CouponRecord[]
  favorites: Record<string, string[]>
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  idempotency: IdempotencyRecord[]
  wallets: WalletRecord[]
  /** Sequência para numerar pedidos (KR-000123). */
  orderSequence: number
}

export type { AppliedCoupon, CollectorDetails }
