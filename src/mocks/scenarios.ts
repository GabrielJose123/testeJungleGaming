import { delay, HttpResponse } from "msw"

import type { ApiErrorBody } from "@/api/types"

import { createRandom } from "./random"

/**
 * Cenários de rede e de negócio do servidor simulado (docs/design.md §8).
 * Seleção: `?scenario=<nome>` na URL (persistido em localStorage) ou `PUT /api/__mock/scenario`.
 */
export const SCENARIOS = {
  default: "Latência determinística de 150–400 ms",
  slow: "2,5 s em toda requisição",
  "variable-latency": "100–2000 ms com semente fixa (respostas fora de ordem)",
  empty: "Catálogo sem resultados",
  "server-error": "500 nas leituras do catálogo",
  flaky: "503 na 1ª tentativa de cada leitura; a repetição passa",
  offline: "Erro de rede em todas as requisições",
  timeout: "Leituras não respondem (timeout do cliente)",
  "session-expired": "Rotas autenticadas respondem 401 SESSION_EXPIRED",
  "price-changed": "Ao criar o pedido, o preço do 1º item sobe 10%",
  "sold-out": "Ao criar o pedido, a edição do 1º item esgota",
  "payment-declined": "O pagamento é recusado",
  "order-timeout": "A 1ª resposta de criação do pedido não chega",
  "wallet-rejected": "A conexão da carteira é recusada",
} as const

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = "kurio:mock-scenario"

export function isScenario(value: unknown): value is ScenarioName {
  return typeof value === "string" && value in SCENARIOS
}

let memoryScenario: ScenarioName = "default"

export function getScenario(): ScenarioName {
  try {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY)
    if (isScenario(stored)) return stored
  } catch {
    // storage indisponível
  }
  return memoryScenario
}

export function setScenario(name: ScenarioName) {
  memoryScenario = name
  resetScenarioState()
  try {
    if (name === "default") localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, name)
  } catch {
    // storage indisponível: fica só em memória
  }
}

// ---------------------------------------------------------------------------
// Estado efêmero dos cenários (por carregamento de página)
// ---------------------------------------------------------------------------

let random = createRandom(7)
const flakySeen = new Set<string>()
/** Efeitos "uma vez por cenário" (preço alterado, esgotado, timeout do pedido). */
const consumed = new Set<string>()

export function resetScenarioState() {
  random = createRandom(7)
  flakySeen.clear()
  consumed.clear()
}

/** Retorna `true` apenas na primeira chamada para a chave enquanto o cenário estiver ativo. */
export function consumeOnce(key: string) {
  const scoped = `${getScenario()}:${key}`
  if (consumed.has(scoped)) return false
  consumed.add(scoped)
  return true
}

function latencyFor(scenario: ScenarioName) {
  switch (scenario) {
    case "slow":
      return 2500
    case "variable-latency":
      return 100 + Math.round(random() * 1900)
    default:
      return 150 + Math.round(random() * 250)
  }
}

function errorResponse(status: number, code: ApiErrorBody["error"]["code"], message: string) {
  const body: ApiErrorBody = { error: { code, message, status, retryable: status >= 500 } }
  return HttpResponse.json(body, { status })
}

export type RouteKind = "catalog" | "read" | "write"

/**
 * Aplica latência e falhas de rede antes do handler. Retorna uma resposta para
 * interromper o fluxo, ou `undefined` para seguir.
 */
export async function applyNetworkConditions(request: Request, kind: RouteKind): Promise<Response | undefined> {
  const scenario = getScenario()
  const isRead = kind !== "write"

  if (scenario === "offline") return HttpResponse.error()
  if (scenario === "timeout" && isRead) {
    await delay("infinite")
  }

  await delay(latencyFor(scenario))

  if (scenario === "server-error" && kind === "catalog") {
    return errorResponse(500, "INTERNAL_ERROR", "Erro interno simulado.")
  }
  if (scenario === "flaky" && isRead) {
    const key = `${request.method} ${request.url}`
    if (!flakySeen.has(key)) {
      flakySeen.add(key)
      return errorResponse(503, "SERVICE_UNAVAILABLE", "Serviço temporariamente indisponível. Tente novamente.")
    }
  }
  return undefined
}
