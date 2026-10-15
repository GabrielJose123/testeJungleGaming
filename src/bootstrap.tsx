import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"

import { createQueryClient } from "./api/query-client"
import { RealtimeProvider } from "./realtime/realtime-provider"
import { parseSearch, stringifySearch } from "./lib/search-serialization"
import { routeTree } from "./routeTree.gen"
import { bindSessionLifecycle } from "./session/session-lifecycle"
import "./index.css"

const queryClient = createQueryClient()
bindSessionLifecycle(queryClient)

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export function mount(container: HTMLElement) {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}
