import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { clearSession, getGuestCartId, refreshSession, resetGuestCartId, setSession } from "@/session/session-store"
import { useSession } from "@/session/use-session"

import { authApi } from "../endpoints"
import { queryKeys } from "../query-keys"
import type { LoginRequest, RegisterRequest, SessionResponse } from "../types"

function startSession(session: SessionResponse) {
  // O carrinho do visitante foi mesclado pelo servidor; o próximo visitante começa outro.
  resetGuestCartId()
  setSession(session)
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: Omit<LoginRequest, "guestCartId">) => authApi.login({ ...input, guestCartId: getGuestCartId() }),
    onSuccess: startSession,
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: Omit<RegisterRequest, "guestCartId">) => authApi.register({ ...input, guestCartId: getGuestCartId() }),
    onSuccess: startSession,
  })
}

/** Logout: avisa o servidor (melhor esforço) e limpa a sessão local mesmo se a chamada falhar. */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
        // Sessão já inválida ou sem rede: o logout local continua.
      }
    },
    onSettled: () => clearSession("logout"),
  })
}

/**
 * Revalida a sessão persistida em segundo plano (boot e a cada 5 min).
 * Um 401 é tratado pelo interceptor do Axios, que encerra a sessão local.
 */
export function useSessionValidation() {
  const session = useSession()
  const query = useQuery({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => authApi.session({ signal }),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })

  useEffect(() => {
    if (query.data && query.data.token === session?.token) refreshSession(query.data)
  }, [query.data, session?.token])

  return query
}
