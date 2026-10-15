import { setupWorker } from "msw/browser"

import { resetDatabase } from "./db/store"
import { resumePendingOrders } from "./domain/orders"
import { controlHandlers } from "./http/control"
import { httpHandlers } from "./http/handlers"
import { isScenario, setScenario } from "./scenarios"

export const worker = setupWorker(...controlHandlers, ...httpHandlers)

/**
 * Liga o servidor simulado antes do primeiro render.
 * `?scenario=<nome>` seleciona o cenário; `?reset=1` restaura o banco inicial.
 * Os dois parâmetros são removidos da URL depois de aplicados.
 */
export async function startMocks() {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get("scenario")
  const reset = url.searchParams.has("reset")

  if (reset) resetDatabase()
  if (isScenario(scenario)) setScenario(scenario)
  else if (scenario) console.warn(`[mocks] cenário desconhecido: ${scenario}`)

  if (reset || scenario) {
    url.searchParams.delete("scenario")
    url.searchParams.delete("reset")
    window.history.replaceState(window.history.state, "", url)
  }

  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: import.meta.env.PROD,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  resumePendingOrders()
}
