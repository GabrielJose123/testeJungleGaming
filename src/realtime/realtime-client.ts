import type { QueryClient } from "@tanstack/react-query"
import type { Socket } from "socket.io-client"

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

let ioModule: Promise<typeof import("socket.io-client")> | null = null
function loadIo() {
  ioModule ??= import("socket.io-client")
  return ioModule
}

export function getSocket() {
  return socket
}

export function reconcile(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all(), refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: queryKeys.private.all(), refetchType: "active" }),
  ])
}

export function startRealtime(queryClient: QueryClient) {
  const gate = new EventGate()
  let current: RealtimeSocket | null = null
  let hasConnectedBefore = false
  let generation = 0

  const handleNft: ServerToClientEvents["nft.updated"] = (event) => applyNftUpdated(queryClient, gate, event)
  const handleOrder: ServerToClientEvents["order.updated"] = (event) => applyOrderUpdated(queryClient, gate, event)
  const handleConnect = () => {
    realtimeStore.setConnection("connected")
    if (hasConnectedBefore) void reconcile(queryClient)
    hasConnectedBefore = true
  }
  const handleDisconnect = (reason: Socket.DisconnectReason) => {
    realtimeStore.setConnection(reason === "io client disconnect" ? "disconnected" : "reconnecting")
  }
  const handleConnectError = () => realtimeStore.setConnection("reconnecting")

  function open() {
    const openGeneration = ++generation
    realtimeStore.setConnection("connecting")
    void loadIo().then(({ io }) => {
      if (openGeneration !== generation) return
      connect(io)
    })
  }

  function connect(io: typeof import("socket.io-client").io) {
    const instance: RealtimeSocket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ["websocket"],
      auth: (callback) => callback(getToken() ? { token: getToken() } : {}),
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    })
    instance.on("connect", handleConnect)
    instance.on("disconnect", handleDisconnect)
    instance.on("connect_error", handleConnectError)
    instance.on("nft.updated", handleNft)
    instance.on("order.updated", handleOrder)
    current = instance
    socket = instance
  }

  function close() {
    generation++
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
