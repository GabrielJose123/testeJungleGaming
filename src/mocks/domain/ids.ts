/** Identificadores do servidor simulado. */
export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export function randomHex(bytes: number) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("")
}
