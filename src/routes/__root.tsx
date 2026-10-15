import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"

import { useSessionValidation } from "@/api/hooks/session"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { RealtimeAnnouncer } from "@/realtime/realtime-announcer"
import { useSessionRedirects } from "@/session/redirects"

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  useSessionValidation()
  useSessionRedirects()
  return (
    <>
      <Outlet />
      <RealtimeAnnouncer />
    </>
  )
}

function NotFound() {
  return (
    <ScreenPlaceholder title="Página não encontrada">
      <p>O endereço acessado não existe.</p>
      <Link to="/" className="text-amber underline">
        Voltar ao início
      </Link>
    </ScreenPlaceholder>
  )
}
