import type { AnyRealtimeEvent } from "@/api/types"

export type GateDecision = "accepted" | "duplicate" | "stale"

const DEFAULT_MEMORY = 500

/**
 * Decide se um evento deve ser aplicado (docs/design.md §3):
 * - `eventId` já visto → "duplicate" (memória limitada aos N mais recentes);
 * - `version` ≤ última versão conhecida do recurso (por evento ou pelo REST) → "stale".
 * Assim duplicatas e eventos antigos nunca regridem estado nem reaplicam efeitos.
 */
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

  /** Registra uma versão vista fora do socket (ex.: resposta REST mais nova). */
  observe(type: string, id: string, version: number) {
    const key = EventGate.resourceKey(type, id)
    if (version > (this.versions.get(key) ?? 0)) this.versions.set(key, version)
  }

  knownVersion(type: string, id: string) {
    return this.versions.get(EventGate.resourceKey(type, id)) ?? 0
  }

  /**
   * @param knownVersion versão que o cliente já tem em cache (REST), se houver.
   */
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
      // Set preserva a ordem de inserção: o primeiro é o mais antigo.
      const oldest = this.seen.values().next().value
      if (oldest !== undefined) this.seen.delete(oldest)
    }
  }

  /** Troca de usuário/sessão: nada da sessão anterior deve influenciar a nova. */
  reset() {
    this.seen.clear()
    this.versions.clear()
  }
}
