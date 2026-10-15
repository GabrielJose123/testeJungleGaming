import { useSyncExternalStore } from "react"

import type { EthAmount, OrderStatus } from "@/api/types"

/**
 * Estado observável do tempo real para a interface: situação da conexão, avisos acessíveis
 * (aria-live) e as últimas mudanças por NFT (para detectar cotação desatualizada no checkout).
 */

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected"

export type RealtimeNotice =
  | {
      id: string
      kind: "nft-changed"
      nftId: string
      name: string | null
      priceEth: EthAmount
      previousPriceEth: EthAmount | null
      available: number
      /** O NFT está no carrinho atual. */
      inCart: boolean
      at: number
    }
  | { id: string; kind: "order-changed"; orderId: string; status: OrderStatus; at: number }

export interface NftChange {
  version: number
  at: number
}

interface RealtimeState {
  connection: ConnectionState
  notices: RealtimeNotice[]
  nftChanges: Record<string, NftChange>
}

const MAX_NOTICES = 20

let state: RealtimeState = { connection: "idle", notices: [], nftChanges: {} }
const listeners = new Set<() => void>()

function set(next: Partial<RealtimeState>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

export const realtimeStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  setConnection(connection: ConnectionState) {
    if (state.connection !== connection) set({ connection })
  },
  pushNotice(notice: RealtimeNotice) {
    set({ notices: [...state.notices, notice].slice(-MAX_NOTICES) })
  },
  dismissNotice(id: string) {
    set({ notices: state.notices.filter((notice) => notice.id !== id) })
  },
  recordNftChange(nftId: string, change: NftChange) {
    set({ nftChanges: { ...state.nftChanges, [nftId]: change } })
  },
  reset() {
    set({ notices: [], nftChanges: {} })
  },
}

export function useRealtimeState() {
  return useSyncExternalStore(realtimeStore.subscribe, realtimeStore.get, realtimeStore.get)
}

/**
 * A cotação ficou desatualizada se algum NFT dela mudou depois que ela foi criada.
 * O checkout usa isso para exigir uma nova revisão antes de confirmar.
 */
export function changedSince(nftIds: string[], since: string | number, changes = state.nftChanges) {
  const threshold = typeof since === "number" ? since : new Date(since).getTime()
  return nftIds.filter((id) => (changes[id]?.at ?? 0) > threshold)
}
