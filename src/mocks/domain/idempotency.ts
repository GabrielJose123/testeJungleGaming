import type { IdempotencyRecord } from "../db/schema"

/** JSON com chaves ordenadas: o mesmo conteúdo sempre gera o mesmo texto. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`
}

/** Hash não criptográfico (cyrb53) — suficiente para comparar payloads. */
export function hashPayload(payload: unknown): string {
  const text = stableStringify(payload)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let index = 0; index < text.length; index++) {
    const char = text.charCodeAt(index)
    h1 = Math.imul(h1 ^ char, 2654435761)
    h2 = Math.imul(h2 ^ char, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

export type IdempotencyDecision =
  | { kind: "new" }
  | { kind: "replay"; orderId: string }
  | { kind: "conflict"; orderId: string }

/**
 * Mesma chave + mesmo payload → repete o pedido existente.
 * Mesma chave + payload diferente → conflito. Chaves são isoladas por usuário.
 */
export function resolveIdempotency(
  records: readonly IdempotencyRecord[],
  userId: string,
  key: string,
  payloadHash: string,
): IdempotencyDecision {
  const record = records.find((entry) => entry.userId === userId && entry.key === key)
  if (!record) return { kind: "new" }
  return record.payloadHash === payloadHash ? { kind: "replay", orderId: record.orderId } : { kind: "conflict", orderId: record.orderId }
}
