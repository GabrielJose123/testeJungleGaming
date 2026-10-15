import type { CreateOrderRequest } from "@/api/types"

/**
 * Chaves de idempotência por tentativa de compra (docs/design.md §7).
 * O mesmo conteúdo (cotação + carteira + rede + dados) reaproveita a mesma chave — inclusive
 * depois de refresh, via sessionStorage —, então clique repetido ou reenvio após timeout nunca
 * cria outro pedido. Conteúdo diferente gera chave nova.
 */

const ATTEMPTS_KEY = "kurio:order-attempts"
const PENDING_PREFIX = "kurio:pending-order:"

type AttemptMap = Record<string, string>

function readAttempts(): AttemptMap {
  try {
    return JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) ?? "{}") as AttemptMap
  } catch {
    return {}
  }
}

function writeAttempts(map: AttemptMap) {
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(map))
  } catch {
    // storage indisponível: a chave vale só nesta execução
  }
}

const memoryAttempts: AttemptMap = {}

/** Impressão digital estável do pedido (chaves ordenadas). */
export function orderFingerprint(request: CreateOrderRequest) {
  const { collector } = request
  return JSON.stringify([
    request.quoteId,
    request.walletId,
    request.network,
    collector.fullName.trim(),
    collector.email.trim().toLowerCase(),
    collector.phone.replace(/\D/g, ""),
    collector.country.trim(),
  ])
}

export function getAttemptKey(request: CreateOrderRequest) {
  const fingerprint = orderFingerprint(request)
  const attempts = { ...memoryAttempts, ...readAttempts() }
  let key = attempts[fingerprint]
  if (!key) {
    key = crypto.randomUUID()
    attempts[fingerprint] = key
    memoryAttempts[fingerprint] = key
    writeAttempts(attempts)
  }
  return key
}

/** Libera a chave quando o pedido termina recusado: uma nova tentativa deve gerar outro pedido. */
export function releaseAttemptKey(idempotencyKey: string) {
  const attempts = readAttempts()
  for (const [fingerprint, key] of Object.entries(attempts)) if (key === idempotencyKey) delete attempts[fingerprint]
  for (const [fingerprint, key] of Object.entries(memoryAttempts)) if (key === idempotencyKey) delete memoryAttempts[fingerprint]
  writeAttempts(attempts)
}

// ---------------------------------------------------------------------------
// Pedido pendente por usuário (retomada após refresh/reconexão)
// ---------------------------------------------------------------------------

export interface PendingOrderRef {
  orderId: string
  idempotencyKey: string
}

export function getPendingOrder(userId: string): PendingOrderRef | null {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + userId)
    return raw ? (JSON.parse(raw) as PendingOrderRef) : null
  } catch {
    return null
  }
}

export function setPendingOrder(userId: string, ref: PendingOrderRef) {
  try {
    localStorage.setItem(PENDING_PREFIX + userId, JSON.stringify(ref))
  } catch {
    // ignore
  }
}

export function clearPendingOrder(userId: string, orderId?: string) {
  try {
    const current = getPendingOrder(userId)
    if (!orderId || current?.orderId === orderId) localStorage.removeItem(PENDING_PREFIX + userId)
  } catch {
    // ignore
  }
}
