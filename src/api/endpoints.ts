import { http } from "./client"
import type {
  AddCartItemRequest,
  ApplyCouponRequest,
  Cart,
  ChangePasswordRequest,
  CreateOrderRequest,
  CreateQuoteRequest,
  CreateWalletRequest,
  FavoritesResponse,
  LoginRequest,
  NftDetail,
  NftListParams,
  NftPage,
  Order,
  OrderListResponse,
  OrderStatus,
  Profile,
  Quote,
  RegisterRequest,
  SessionResponse,
  UpdateAvatarRequest,
  UpdateCartItemRequest,
  UpdateProfileRequest,
  UpdateWalletRequest,
  Wallet,
  WalletListResponse,
} from "./types"

interface RequestOptions {
  signal?: AbortSignal
}

export function toNftQuery(params: NftListParams) {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      if (value.length > 0) query[key] = value.join(",")
    } else query[key] = String(value)
  }
  return query
}

export const authApi = {
  register: (body: RegisterRequest) => http.post<SessionResponse>("/auth/register", body).then((r) => r.data),
  login: (body: LoginRequest) => http.post<SessionResponse>("/auth/login", body).then((r) => r.data),
  session: ({ signal }: RequestOptions = {}) => http.get<SessionResponse>("/auth/session", { signal }).then((r) => r.data),
  logout: () => http.post<void>("/auth/logout").then(() => undefined),
}

export const nftsApi = {
  list: (params: NftListParams, { signal }: RequestOptions = {}) =>
    http.get<NftPage>("/nfts", { params: toNftQuery(params), signal }).then((r) => r.data),
  detail: (id: string, { signal }: RequestOptions = {}) =>
    http.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, { signal }).then((r) => r.data),
}

export const favoritesApi = {
  list: ({ signal }: RequestOptions = {}) => http.get<FavoritesResponse>("/favorites", { signal }).then((r) => r.data),
  add: (nftId: string) => http.put<void>(`/favorites/${encodeURIComponent(nftId)}`).then(() => undefined),
  remove: (nftId: string) => http.delete<void>(`/favorites/${encodeURIComponent(nftId)}`).then(() => undefined),
}

export const cartApi = {
  get: ({ signal }: RequestOptions = {}) => http.get<Cart>("/cart", { signal }).then((r) => r.data),
  addItem: (body: AddCartItemRequest) => http.post<Cart>("/cart/items", body).then((r) => r.data),
  updateItem: (itemId: string, body: UpdateCartItemRequest) =>
    http.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, body).then((r) => r.data),
  removeItem: (itemId: string) => http.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`).then((r) => r.data),
  applyCoupon: (body: ApplyCouponRequest) => http.put<Cart>("/cart/coupon", body).then((r) => r.data),
  removeCoupon: () => http.delete<Cart>("/cart/coupon").then((r) => r.data),
}

export const quotesApi = {
  create: (body: CreateQuoteRequest) => http.post<Quote>("/quotes", body).then((r) => r.data),
}

export const ordersApi = {
  create: (body: CreateOrderRequest, idempotencyKey: string) =>
    http.post<Order>("/orders", body, { headers: { "Idempotency-Key": idempotencyKey } }).then((r) => r.data),
  get: (id: string, { signal }: RequestOptions = {}) =>
    http.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal }).then((r) => r.data),
  list: (status: OrderStatus | undefined, { signal }: RequestOptions = {}) =>
    http.get<OrderListResponse>("/orders", { params: status ? { status } : undefined, signal }).then((r) => r.data),
}

export const profileApi = {
  get: ({ signal }: RequestOptions = {}) => http.get<Profile>("/profile", { signal }).then((r) => r.data),
  update: (body: UpdateProfileRequest) => http.patch<Profile>("/profile", body).then((r) => r.data),
  updateAvatar: (body: UpdateAvatarRequest) => http.put<Profile>("/profile/avatar", body).then((r) => r.data),
  changePassword: (body: ChangePasswordRequest) => http.post<void>("/profile/password", body).then(() => undefined),
}

export const walletsApi = {
  list: ({ signal }: RequestOptions = {}) => http.get<WalletListResponse>("/wallets", { signal }).then((r) => r.data),
  create: (body: CreateWalletRequest) => http.post<Wallet>("/wallets", body).then((r) => r.data),
  update: (id: string, body: UpdateWalletRequest) =>
    http.patch<Wallet>(`/wallets/${encodeURIComponent(id)}`, body).then((r) => r.data),
  connect: (id: string) => http.post<Wallet>(`/wallets/${encodeURIComponent(id)}/connect`).then((r) => r.data),
  disconnect: (id: string) => http.post<Wallet>(`/wallets/${encodeURIComponent(id)}/disconnect`).then((r) => r.data),
}
