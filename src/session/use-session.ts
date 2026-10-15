import { useSyncExternalStore } from "react"

import { privateScope } from "@/api/query-keys"

import { getGuestCartId, sessionStore } from "./session-store"

export function useSession() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}

export function useCurrentUserId() {
  return useSession()?.user.id ?? null
}

/** Escopo das query keys privadas: usuário logado ou carrinho do visitante. */
export function usePrivateScope() {
  return privateScope(useCurrentUserId(), getGuestCartId())
}
