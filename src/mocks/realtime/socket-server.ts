import { toSocketIo } from "@mswjs/socket.io-binding"
import { ws, type WebSocketHandlerConnection } from "msw"

import type { AnyRealtimeEvent } from "@/api/types"

import { resolveSession } from "../domain/auth"
import { MockApiError } from "../domain/errors"
import { subscribe } from "../events"

/**
 * Servidor Socket.IO simulado sobre o interceptador de WebSocket do MSW.
 *
 * Limitações (ver ARCHITECTURE.md):
 * - Só o transporte `websocket` (o cliente usa `transports: ["websocket"]`; long-polling não é simulado).
 * - O binding responde ao handshake do Engine.IO, mas não envia pings: este servidor envia o ping
 *   ("2") periodicamente para o cliente não encerrar a conexão por timeout.
 * - O binding só decodifica pacotes EVENT. O `auth` do CONNECT ("40{...}") é lido da mensagem bruta.
 * - Sem namespaces, rooms ou acks: o roteamento por usuário é feito aqui, num registro próprio.
 */

/**
 * Caminho do Socket.IO. O padrão "/socket.io/" não serve: o MSW o remove do pathname antes de
 * casar o handler, e o que sobra ("/") colidiria com o WebSocket de HMR do Vite.
 */
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
  // CONNECT do namespace padrão: "40" ou "40{"token":"..."}".
  if (!raw.startsWith("40")) return
  const payload = raw.slice(2)
  if (!payload) return
  try {
    const { token } = JSON.parse(payload) as { token?: string }
    entry.userId = resolveSession(token ?? null)?.user.id ?? null
  } catch (error) {
    // Token inválido/expirado: a conexão segue anônima (só eventos públicos).
    if (!(error instanceof MockApiError)) console.warn("[mocks] auth do socket inválido", error)
    entry.userId = null
  }
}

function deliver(event: AnyRealtimeEvent) {
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
      heartbeat: setInterval(() => connection.client.send("2"), PING_INTERVAL_MS),
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

/** Reenvia um evento tal como veio (duplicata ou evento antigo) — usado pelos cenários de teste. */
export function emitRaw(event: AnyRealtimeEvent) {
  deliver(event)
}

/** Derruba todas as conexões; o socket.io-client reconecta sozinho. */
export function disconnectAllSockets() {
  for (const entry of clients.values()) entry.connection.client.close(4000, "mock disconnect")
}

export function connectedSockets() {
  return [...clients.values()].map((entry) => ({ id: entry.connection.client.id, userId: entry.userId }))
}
