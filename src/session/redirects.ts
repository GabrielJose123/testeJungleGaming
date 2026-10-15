import { useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

import { sessionStore } from "./session-store"

const AUTH_PAGES = ["/entrar", "/cadastro"]

/**
 * Aceita apenas caminhos internos como destino pós-login (evita open redirect e loops).
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return undefined
  const path = value.split(/[?#]/)[0]
  return AUTH_PAGES.includes(path) ? undefined : value
}

/**
 * Reage ao fim da sessão:
 * - expirada → vai para o login guardando a rota atual (o checkout retoma depois);
 * - logout ou mudança em outra aba → reavalia as guardas das rotas privadas.
 */
export function useSessionRedirects() {
  const router = useRouter()
  useEffect(
    () =>
      sessionStore.subscribe(({ reason }) => {
        if (reason === "expired") {
          const redirect = safeRedirect(router.state.location.href)
          void router.navigate({ to: "/entrar", search: { redirect, reason: "expired" } })
        } else if (reason === "logout" || reason === "storage") {
          void router.invalidate()
        }
      }),
    [router],
  )
}
