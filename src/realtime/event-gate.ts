import type { AnyRealtimeEvent } from "@/api/types"

export type GateDecision = "accepted" | "duplicate" | "stale"

const DEFAULT_MEMORY = 500

export class EventGate {
  private readonly seen = new Set<string>()
  private readonly versions = new Map<string, number>()
  private readonly memory: number

  constructor(memory = DEFAULT_MEMORY) {
    this.memory = memory
  }

  private static resourceKey(type: string, id: string) {
    return `${type}:${id}`
  }

  observe(type: string, id: string, version: number) {
    const key = EventGate.resourceKey(type, id)
    if (version > (this.versions.get(key) ?? 0)) this.versions.set(key, version)
  }

  knownVersion(type: string, id: string) {
    return this.versions.get(EventGate.resourceKey(type, id)) ?? 0
  }

  accept(event: Pick<AnyRealtimeEvent, "eventId" | "resource" | "version">, knownVersion = 0): GateDecision {
    if (this.seen.has(event.eventId)) return "duplicate"
    this.remember(event.eventId)

    const key = EventGate.resourceKey(event.resource.type, event.resource.id)
    const latest = Math.max(this.versions.get(key) ?? 0, knownVersion)
    if (event.version <= latest) return "stale"
    this.versions.set(key, event.version)
    return "accepted"
  }

  private remember(eventId: string) {
    this.seen.add(eventId)
    if (this.seen.size > this.memory) {
      const oldest = this.seen.values().next().value
      if (oldest !== undefined) this.seen.delete(oldest)
    }
  }

  reset() {
    this.seen.clear()
    this.versions.clear()
  }
}
