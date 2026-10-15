import type { QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/api/query-keys"

import { sessionStore, type SessionChange } from "./session-store"

type SessionEndHandler = (change: SessionChange) => void

const endHandlers = new Set<SessionEndHandler>()

export function onIdentityChange(handler: SessionEndHandler) {
  endHandlers.add(handler)
  return () => {
    endHandlers.delete(handler)
  }
}

export function identityChanged({ previous, current, reason }: SessionChange) {
  if (reason === "refresh") return false
  return previous?.user.id !== current?.user.id || previous?.token !== current?.token
}

export function bindSessionLifecycle(queryClient: QueryClient) {
  return sessionStore.subscribe((change) => {
    if (!identityChanged(change)) return
    void queryClient.cancelQueries({ queryKey: queryKeys.private.all() })
    queryClient.removeQueries({ queryKey: queryKeys.private.all() })
    queryClient.removeQueries({ queryKey: queryKeys.session() })
    for (const handler of endHandlers) handler(change)
  })
}
