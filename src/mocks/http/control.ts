import { http } from "msw"

import { isEthAmount } from "@/lib/money"

import { resetDatabase } from "../db/store"
import { expireAllSessions } from "../domain/auth"
import { updateNft, type NftChange } from "../domain/catalog"
import { MockApiError, assertValid } from "../domain/errors"
import { getScenario, isScenario, SCENARIOS, setScenario } from "../scenarios"
import { api, errorResponse, json, noContent, readJson } from "./route"

/**
 * Rotas de controle do servidor simulado (`/api/__mock/*`): reset, cenário e disparo de eventos.
 * Não passam pelas condições de rede do cenário. Existem só com os mocks ativos.
 */

function guard(handler: (request: Request, params: Record<string, string>) => Promise<Response> | Response) {
  return async ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
    try {
      return await handler(request, params as Record<string, string>)
    } catch (error) {
      if (error instanceof MockApiError) return errorResponse(error)
      throw error
    }
  }
}

export const controlHandlers = [
  http.post(
    api("/__mock/reset"),
    guard(() => {
      resetDatabase()
      setScenario("default")
      return noContent()
    }),
  ),

  http.get(api("/__mock/scenario"), guard(() => json({ active: getScenario(), available: SCENARIOS }))),

  http.put(
    api("/__mock/scenario"),
    guard(async (request) => {
      const { name } = await readJson<{ name: string }>(request)
      if (!isScenario(name)) assertValid({ name: `Use um de: ${Object.keys(SCENARIOS).join(", ")}` })
      setScenario(name as Parameters<typeof setScenario>[0])
      return json({ active: getScenario() })
    }),
  ),

  /** Altera preço/estoque e publica `nft.updated` (REST e socket ficam consistentes). */
  http.patch(
    api("/__mock/nfts/:id"),
    guard(async (request, params) => {
      const body = await readJson<NftChange>(request)
      const errors: Record<string, string> = {}
      if (body.priceEth !== undefined && !isEthAmount(body.priceEth)) errors.priceEth = "Preço inválido."
      if (body.available !== undefined && (!Number.isInteger(body.available) || body.available < 0)) errors.available = "Quantidade inválida."
      assertValid(errors)
      const nft = updateNft(params.id, body)
      return json({ id: nft.id, version: nft.version })
    }),
  ),

  http.post(
    api("/__mock/sessions/expire"),
    guard(() => {
      expireAllSessions()
      return noContent()
    }),
  ),
]
