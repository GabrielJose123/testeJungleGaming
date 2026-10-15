import { describe, expect, it } from "vitest"

import { EventGate } from "./event-gate"

const event = (eventId: string, version: number, id = "nft-1") => ({ eventId, version, resource: { type: "nft" as const, id } })

describe("EventGate", () => {
  it("aceita eventos novos em ordem crescente de versão", () => {
    const gate = new EventGate()
    expect(gate.accept(event("e1", 2))).toBe("accepted")
    expect(gate.accept(event("e2", 3))).toBe("accepted")
    expect(gate.knownVersion("nft", "nft-1")).toBe(3)
  })

  it("descarta duplicatas pelo eventId", () => {
    const gate = new EventGate()
    gate.accept(event("e1", 2))
    expect(gate.accept(event("e1", 2))).toBe("duplicate")
  })

  it("descarta evento antigo mesmo com eventId novo (não regride estado)", () => {
    const gate = new EventGate()
    gate.accept(event("e1", 5))
    expect(gate.accept(event("e2", 4))).toBe("stale")
    expect(gate.accept(event("e3", 5))).toBe("stale")
    expect(gate.knownVersion("nft", "nft-1")).toBe(5)
  })

  it("respeita a versão já conhecida pelo REST", () => {
    const gate = new EventGate()
    expect(gate.accept(event("e1", 3), 3)).toBe("stale")
    gate.observe("nft", "nft-1", 7)
    expect(gate.accept(event("e2", 6))).toBe("stale")
    expect(gate.accept(event("e3", 8))).toBe("accepted")
  })

  it("versões são independentes por recurso", () => {
    const gate = new EventGate()
    gate.accept(event("e1", 9, "a"))
    expect(gate.accept(event("e2", 1, "b"))).toBe("accepted")
  })

  it("memória de eventIds é limitada (LRU)", () => {
    const gate = new EventGate(2)
    gate.accept(event("e1", 1, "a"))
    gate.accept(event("e2", 1, "b"))
    gate.accept(event("e3", 1, "c"))
    // e1 saiu da memória, mas a versão ainda barra o reprocessamento.
    expect(gate.accept(event("e1", 1, "a"))).toBe("stale")
  })

  it("reset esquece a sessão anterior", () => {
    const gate = new EventGate()
    gate.accept(event("e1", 4))
    gate.reset()
    expect(gate.accept(event("e1", 2))).toBe("accepted")
  })
})
