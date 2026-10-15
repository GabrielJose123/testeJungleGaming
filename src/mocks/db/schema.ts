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
  outcome: OrderOutcome
  settleAt: IsoDateTime
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
  orderSequence: number
}

export type { AppliedCoupon, CollectorDetails }
