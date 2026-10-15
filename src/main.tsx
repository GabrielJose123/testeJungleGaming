import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"

import { createQueryClient } from "./api/query-client"
import { routeTree } from "./routeTree.gen"
import { bindSessionLifecycle } from "./session/session-lifecycle"
import "./index.css"

const queryClient = createQueryClient()
bindSessionLifecycle(queryClient)

const router = createRouter({ routeTree, defaultPreload: "intent", scrollRestoration: true })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

async function enableMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "true") return
  const { startMocks } = await import("./mocks/browser")
  await startMocks()
}

enableMocks().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
