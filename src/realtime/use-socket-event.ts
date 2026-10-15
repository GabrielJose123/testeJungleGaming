import { useEffect, useRef } from "react"

import type { ServerToClientEvents } from "@/api/types"

import { getSocket } from "./realtime-client"
import { realtimeStore } from "./realtime-store"

/**
 * Listener de componente para um evento do socket, removido no unmount.
 * O cache já é atualizado pelo provider; use isto apenas para efeitos de UI locais.
 */
export function useSocketEvent<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    const listener = ((...args: Parameters<ServerToClientEvents[E]>) =>
      (handlerRef.current as (...a: Parameters<ServerToClientEvents[E]>) => void)(...args)) as ServerToClientEvents[E]

    let attached = getSocket()
    const attach = () => {
      const next = getSocket()
      if (next === attached) return
      // O socket muda na troca de identidade: move o listener para o novo.
      attached?.off(event, listener as never)
      attached = next
      attached?.on(event, listener as never)
    }
    attached?.on(event, listener as never)
    const unsubscribe = realtimeStore.subscribe(attach)
    return () => {
      unsubscribe()
      attached?.off(event, listener as never)
    }
  }, [event])
}
