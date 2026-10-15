import { test as base, expect, type Page } from "@playwright/test"

/**
 * Controle do servidor simulado a partir dos testes. As chamadas saem de DENTRO da página
 * (`page.evaluate(fetch)`) para passar pelo MSW — `page.request` iria direto à rede.
 */
export class MockServer {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  private async call(method: string, path: string, body?: unknown) {
    return this.page.evaluate(
      async ({ method, path, body }) => {
        const response = await fetch(`/api/__mock${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        if (!response.ok) throw new Error(`mock ${method} ${path} → ${response.status}`)
        return response.status === 204 ? null : response.json()
      },
      { method, path, body },
    )
  }

  scenario(name: string) {
    return this.call("PUT", "/scenario", { name })
  }

  reset() {
    return this.call("POST", "/reset")
  }

  /** Muda preço/estoque no servidor → resposta REST e evento `nft.updated` via Socket.IO. */
  updateNft(nftId: string, change: { editionId?: string; priceEth?: string; available?: number }) {
    return this.call("PATCH", `/nfts/${nftId}`, change)
  }

  replayEvent(mode: "duplicate" | "stale", resourceId?: string) {
    return this.call("POST", "/events/replay", { mode, resourceId })
  }

  disconnectSockets() {
    return this.call("POST", "/socket/disconnect")
  }

  expireSessions() {
    return this.call("POST", "/sessions/expire")
  }
}

export const credentials = {
  ana: { email: "ana@kurio.dev", password: "Kurio@123", name: "Ana Souza" },
  bruno: { email: "bruno@kurio.dev", password: "Kurio@123", name: "Bruno Lima" },
} as const

export const test = base.extend<{ mock: MockServer }>({
  mock: async ({ page }, use) => {
    await use(new MockServer(page))
  },
})

export { expect }
