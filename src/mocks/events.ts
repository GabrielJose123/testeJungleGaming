import type { AnyRealtimeEvent } from "@/api/types"

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

export function recentEvents(): readonly AnyRealtimeEvent[] {
  return history
}
