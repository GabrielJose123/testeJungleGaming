import type { AnyRealtimeEvent } from "@/api/types"

/**
 * Barramento interno do servidor simulado: os domínios publicam eventos aqui e o
 * servidor Socket.IO simulado (src/mocks/realtime) os entrega aos clientes conectados.
 * Assim, toda mudança nos dados aparece tanto no REST quanto no socket.
 */

type Listener = (event: AnyRealtimeEvent) => void

const listeners = new Set<Listener>()
const history: AnyRealtimeEvent[] = []
const HISTORY_LIMIT = 100

export function publish(event: AnyRealtimeEvent) {
  history.push(event)
  if (history.length > HISTORY_LIMIT) history.shift()
  for (const listener of listeners) listener(event)
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Últimos eventos publicados (para reenviar duplicatas/antigos nos cenários de teste). */
export function recentEvents(): readonly AnyRealtimeEvent[] {
  return history
}
