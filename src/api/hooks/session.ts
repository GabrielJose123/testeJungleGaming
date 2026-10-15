import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect } from "react"

import { clearSession, getGuestCartId, refreshSession, resetGuestCartId, setSession } from "@/session/session-store"
import { useSession } from "@/session/use-session"

import { authApi } from "../endpoints"
import { queryKeys } from "../query-keys"
import type { LoginRequest, RegisterRequest, SessionResponse } from "../types"

function startSession(session: SessionResponse) {
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

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch {
      }
    },
    onSettled: () => clearSession("logout"),
  })
}

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
