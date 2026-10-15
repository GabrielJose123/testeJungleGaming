import type { NftListParams } from "./types"

/**
 * Fábrica de query keys (docs/design.md §4). Dados privados ficam sob ["private", scope, ...]:
 * o escopo isola usuários e permite limpar tudo de uma vez no logout ou na troca de usuário.
 */
export const queryKeys = {
  session: () => ["session"] as const,

  nfts: {
    all: () => ["nfts"] as const,
    lists: () => ["nfts", "list"] as const,
    list: (params: NftListParams) => ["nfts", "list", params] as const,
    detail: (id: string) => ["nfts", "detail", id] as const,
  },

  private: {
    all: () => ["private"] as const,
    scope: (scope: string) => ["private", scope] as const,
    cart: (scope: string) => ["private", scope, "cart"] as const,
    favorites: (userId: string) => ["private", userId, "favorites"] as const,
    order: (userId: string, orderId: string) => ["private", userId, "orders", orderId] as const,
    pendingOrders: (userId: string) => ["private", userId, "orders", "pending"] as const,
    profile: (userId: string) => ["private", userId, "profile"] as const,
    wallets: (userId: string) => ["private", userId, "wallets"] as const,
  },
}

/** Escopo dos dados privados: o usuário logado ou o carrinho do visitante. */
export function privateScope(userId: string | null | undefined, guestCartId: string) {
  return userId ?? `guest:${guestCartId}`
}
