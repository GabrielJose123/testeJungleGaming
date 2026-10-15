import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { getSession } from "@/session/session-store"

/**
 * Guarda das rotas privadas (checkout, pedidos, perfil, carteiras): sem sessão, vai para o
 * login com `redirect` apontando de volta para onde o usuário estava.
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ location }) => {
    if (!getSession()) {
      throw redirect({ to: "/entrar", search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
