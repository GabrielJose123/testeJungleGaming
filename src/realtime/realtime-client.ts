import type { QueryClient } from "@tanstack/react-query"
import { io, type Socket } from "socket.io-client"

import { SOCKET_PATH, SOCKET_URL } from "@/api/config"
import { queryKeys } from "@/api/query-keys"
import type { ClientToServerEvents, ServerToClientEvents } from "@/api/types"
import { onIdentityChange } from "@/session/session-lifecycle"
import { getToken } from "@/session/session-store"

import { applyNftUpdated, applyOrderUpdated } from "./apply-events"
import { EventGate } from "./event-gate"
import { realtimeStore } from "./realtime-store"

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: RealtimeSocket | null = null

/** Socket atual (para hooks de componentes registrarem listeners próprios). */
export function getSocket() {
  return socket
}

/**
 * Após reconectar, eventos podem ter sido perdidos: reconcilia os recursos ativos com o REST.
 * `refetchType: "active"` só refaz o que está na tela; o resto revalida quando voltar a ser usado.
 */
export function reconcile(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all(), refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: queryKeys.private.all(), refetchType: "active" }),
  ])
}

/**
 * Liga o cliente Socket.IO ao cache. Retorna `stop()`, que remove todos os listeners e
 * desconecta — chamado no unmount do provider. Na troca de identidade (login, logout,
 * expiração), o socket anterior é encerrado e um novo é aberto com o token atual.
 */
export function startRealtime(queryClient: QueryClient) {
  const gate = new EventGate()
  let current: RealtimeSocket | null = null
  let hasConnectedBefore = false

  const handleNft: ServerToClientEvents["nft.updated"] = (event) => applyNftUpdated(queryClient, gate, event)
  const handleOrder: ServerToClientEvents["order.updated"] = (event) => applyOrderUpdated(queryClient, gate, event)
  const handleConnect = () => {
    realtimeStore.setConnection("connected")
    if (hasConnectedBefore) void reconcile(queryClient)
    hasConnectedBefore = true
  }
  const handleDisconnect = (reason: Socket.DisconnectReason) => {
    // "io client disconnect" = encerramos de propósito; o resto tenta reconectar sozinho.
    realtimeStore.setConnection(reason === "io client disconnect" ? "disconnected" : "reconnecting")
  }
  const handleConnectError = () => realtimeStore.setConnection("reconnecting")

  function open() {
    const instance: RealtimeSocket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ["websocket"],
      // Função: a cada (re)conexão envia o token vigente.
      auth: (callback) => callback(getToken() ? { token: getToken() } : {}),
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    })
    instance.on("connect", handleConnect)
    instance.on("disconnect", handleDisconnect)
    instance.on("connect_error", handleConnectError)
    instance.on("nft.updated", handleNft)
    instance.on("order.updated", handleOrder)
    realtimeStore.setConnection("connecting")
    current = instance
    socket = instance
  }

  function close() {
    if (!current) return
    current.off("connect", handleConnect)
    current.off("disconnect", handleDisconnect)
    current.off("connect_error", handleConnectError)
    current.off("nft.updated", handleNft)
    current.off("order.updated", handleOrder)
    current.disconnect()
    if (socket === current) socket = null
    current = null
    realtimeStore.setConnection("disconnected")
  }

  open()

  const stopIdentityWatch = onIdentityChange(() => {
    // Nada da sessão anterior pode atualizar a nova: fecha, zera o portão e reabre.
    close()
    gate.reset()
    realtimeStore.reset()
    hasConnectedBefore = false
    open()
  })

  return function stop() {
    stopIdentityWatch()
    close()
  }
}
