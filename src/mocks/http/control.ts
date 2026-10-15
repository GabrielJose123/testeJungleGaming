import { http } from "msw"

import type { AnyRealtimeEvent } from "@/api/types"
import { isEthAmount } from "@/lib/money"

import { resetDatabase } from "../db/store"
import { expireAllSessions } from "../domain/auth"
import { updateNft, type NftChange } from "../domain/catalog"
import { MockApiError, assertValid } from "../domain/errors"
import { newId } from "../domain/ids"
import { recentEvents } from "../events"
import { connectedSockets, disconnectAllSockets, emitRaw } from "../realtime/socket-server"
import { getScenario, isScenario, SCENARIOS, setScenario } from "../scenarios"
import { api, errorResponse, json, noContent, readJson } from "./route"

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
    api("/__mock/events/replay"),
    guard(async (request) => {
      const { mode, resourceId } = await readJson<{ mode: "duplicate" | "stale"; resourceId?: string }>(request)
      const history = recentEvents().filter((event) => !resourceId || event.resource.id === resourceId)
      const last = history.at(-1)
      if (!last) throw new MockApiError(404, "NOT_FOUND", "Nenhum evento publicado para reenviar.")
      let event: AnyRealtimeEvent = last
      if (mode === "stale") {
        const previous = history.slice(0, -1).filter((entry) => entry.resource.id === last.resource.id).at(-1)
        event = previous
          ? { ...previous, eventId: newId("evt") }
          : ({ ...last, eventId: newId("evt"), version: last.version - 1 } as AnyRealtimeEvent)
      }
      emitRaw(event)
      return json({ eventId: event.eventId, version: event.version })
    }),
  ),

  http.post(
    api("/__mock/socket/disconnect"),
    guard(() => {
      disconnectAllSockets()
      return noContent()
    }),
  ),

  http.get(api("/__mock/socket"), guard(() => json({ clients: connectedSockets() }))),

  http.post(
    api("/__mock/sessions/expire"),
    guard(() => {
      expireAllSessions()
      return noContent()
    }),
  ),
]
