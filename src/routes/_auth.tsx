import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { getSession } from "@/session/session-store"

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ location }) => {
    if (!getSession()) {
      throw redirect({ to: "/entrar", search: { redirect: location.href } })
    }
  },
  component: Outlet,
})
