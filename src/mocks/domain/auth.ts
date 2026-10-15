import type { SessionResponse, User } from "@/api/types"

import type { MockDatabase, UserRecord } from "../db/schema"
import { db, mutate } from "../db/store"
import { MockApiError } from "./errors"
import { randomHex } from "./ids"

export const SESSION_TTL_MS = 30 * 60 * 1000
const PBKDF2_ITERATIONS = 100_000

// ---------------------------------------------------------------------------
// Senhas: PBKDF2-SHA256 com salt por usuário (WebCrypto). Nada é guardado em claro.
// ---------------------------------------------------------------------------

function hexToBytes(hex: string) {
  return new Uint8Array(hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)))
}

async function derive(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function hashPassword(password: string) {
  const salt = randomHex(16)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${await derive(password, salt, PBKDF2_ITERATIONS)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split("$")
  if (scheme !== "pbkdf2" || !salt || !hash) return false
  const candidate = await derive(password, salt, Number(iterations))
  // Comparação em tempo constante.
  let diff = candidate.length ^ hash.length
  for (let index = 0; index < Math.min(candidate.length, hash.length); index++) diff |= candidate.charCodeAt(index) ^ hash.charCodeAt(index)
  return diff === 0
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mínimo 8 caracteres com letra maiúscula, minúscula e número. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) return "A senha precisa ter ao menos 8 caracteres."
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Use letras maiúsculas, minúsculas e números."
  }
  return null
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------------------

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    avatarUrl: record.avatarUrl,
    bio: record.bio,
    createdAt: record.createdAt,
  }
}

export function createSession(userId: string, now = new Date()): SessionResponse {
  return mutate((data) => {
    const user = data.users.find((entry) => entry.id === userId)!
    const session = { token: `tok_${randomHex(24)}`, userId, expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString() }
    // Limpa sessões vencidas para o banco não crescer.
    data.sessions = data.sessions.filter((entry) => new Date(entry.expiresAt).getTime() > now.getTime())
    data.sessions.push(session)
    return { token: session.token, expiresAt: session.expiresAt, user: toUser(user) }
  })
}

export function revokeSession(token: string) {
  mutate((data) => {
    data.sessions = data.sessions.filter((entry) => entry.token !== token)
  })
}

export function expireAllSessions(now = new Date()) {
  mutate((data) => {
    for (const session of data.sessions) session.expiresAt = new Date(now.getTime() - 1000).toISOString()
  })
}

export function bearerToken(request: Request) {
  const header = request.headers.get("Authorization")
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null
}

export interface AuthContext {
  token: string
  user: UserRecord
  expiresAt: string
}

/**
 * Resolve a sessão do token. Token ausente → `null`. Token desconhecido → UNAUTHENTICATED.
 * Token vencido → SESSION_EXPIRED.
 */
export function resolveSession(token: string | null, data: MockDatabase = db(), now = new Date()): AuthContext | null {
  if (!token) return null
  const session = data.sessions.find((entry) => entry.token === token)
  if (!session) throw new MockApiError(401, "UNAUTHENTICATED", "Sessão inválida. Entre novamente.")
  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    throw new MockApiError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para continuar.")
  }
  const user = data.users.find((entry) => entry.id === session.userId)
  if (!user) throw new MockApiError(401, "UNAUTHENTICATED", "Sessão inválida. Entre novamente.")
  return { token, user, expiresAt: session.expiresAt }
}

export function requireSession(token: string | null) {
  const auth = resolveSession(token)
  if (!auth) throw new MockApiError(401, "UNAUTHENTICATED", "Entre na sua conta para continuar.")
  return auth
}
