import { toSocketIo } from "@mswjs/socket.io-binding"
import { ws, type WebSocketHandlerConnection } from "msw"

import type { AnyRealtimeEvent } from "@/api/types"

import { resolveSession } from "../domain/auth"
import { MockApiError } from "../domain/errors"
import { subscribe } from "../events"

const SOCKET_PATH = /\/realtime\//
const PING_INTERVAL_MS = 20_000

interface ClientEntry {
  connection: WebSocketHandlerConnection
  io: ReturnType<typeof toSocketIo>
  userId: string | null
  heartbeat: ReturnType<typeof setInterval>
}

const clients = new Map<string, ClientEntry>()

function authenticate(entry: ClientEntry, raw: string) {
  if (!raw.startsWith("40")) return
  const payload = raw.slice(2)
  if (!payload) return
  try {
    const { token } = JSON.parse(payload) as { token?: string }
    entry.userId = resolveSession(token ?? null)?.user.id ?? null
  } catch (error) {
    if (!(error instanceof MockApiError)) console.warn("[mocks] auth do socket inválido", error)
    entry.userId = null
  }
}

function prune() {
  for (const [id, entry] of clients) {
    const socket = (entry.connection.client as unknown as { socket?: WebSocket }).socket
    if (socket && socket.readyState === WebSocket.CLOSED) {
      clearInterval(entry.heartbeat)
      clients.delete(id)
    }
  }
}

function deliver(event: AnyRealtimeEvent) {
  prune()
  for (const entry of clients.values()) {
    if (event.type === "order.updated" && event.data.userId !== entry.userId) continue
    entry.io.client.emit(event.type, event)
  }
}

subscribe(deliver)

const link = ws.link(SOCKET_PATH)

export const socketHandlers = [
  link.addEventListener("connection", (connection) => {
    const entry: ClientEntry = {
      connection,
      io: toSocketIo(connection),
      userId: null,
      heartbeat: setInterval(() => {
        prune()
        if (clients.has(connection.client.id)) connection.client.send("2")
      }, PING_INTERVAL_MS),
    }
    clients.set(connection.client.id, entry)

    connection.client.addEventListener("message", (event) => {
      if (typeof event.data === "string") authenticate(entry, event.data)
    })
    connection.client.addEventListener("close", () => {
      clearInterval(entry.heartbeat)
      clients.delete(connection.client.id)
    })
  }),
]

export function emitRaw(event: AnyRealtimeEvent) {
  deliver(event)
}

export function disconnectAllSockets() {
  for (const entry of clients.values()) entry.connection.client.close(4000, "mock disconnect")
}

export function connectedSockets() {
  prune()
  return [...clients.values()].map((entry) => ({ id: entry.connection.client.id, userId: entry.userId }))
}
