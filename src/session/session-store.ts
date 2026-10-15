import type { SessionResponse, User } from "@/api/types"

/**
 * Estado da sessão fora do React: lido pelo interceptor do Axios, pelas guardas do
 * TanStack Router, pelo socket e pelos hooks (via useSyncExternalStore).
 * Persistido em localStorage para sobreviver a refresh; sincronizado entre abas.
 */

const SESSION_KEY = "kurio:session"
const GUEST_CART_KEY = "kurio:guest-cart-id"

export interface Session {
  token: string
  expiresAt: string
  user: User
}

export type SessionEndReason = "logout" | "expired"

export interface SessionChange {
  previous: Session | null
  current: Session | null
  reason: "login" | "refresh" | SessionEndReason | "storage"
}

type Listener = (change: SessionChange) => void

const listeners = new Set<Listener>()
let current: Session | null = read()
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage
  } catch {
    return null
  }
}

function isExpired(session: Session, now = Date.now()) {
  return new Date(session.expiresAt).getTime() <= now
}

function read(): Session | null {
  const raw = storage()?.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Session
    return session.token && session.user && !isExpired(session) ? session : null
  } catch {
    return null
  }
}

function write(session: Session | null) {
  try {
    if (session) storage()?.setItem(SESSION_KEY, JSON.stringify(session))
    else storage()?.removeItem(SESSION_KEY)
  } catch {
    // storage indisponível: a sessão fica só em memória
  }
}

function emit(change: SessionChange) {
  for (const listener of listeners) listener(change)
}

function scheduleExpiry(session: Session | null) {
  clearTimeout(expiryTimer)
  if (!session) return
  const wait = new Date(session.expiresAt).getTime() - Date.now()
  // setTimeout aceita até ~24,8 dias; sessões são de 30 min.
  if (wait > 0 && wait < 2 ** 31 - 1) expiryTimer = setTimeout(() => expireSession(), wait)
}

function replace(next: Session | null, reason: SessionChange["reason"]) {
  const previous = current
  current = next
  write(next)
  scheduleExpiry(next)
  emit({ previous, current: next, reason })
}

scheduleExpiry(current)

export const sessionStore = {
  get: () => current,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function getSession() {
  return current
}

export function getToken() {
  return current?.token ?? null
}

export function setSession(response: SessionResponse) {
  replace({ token: response.token, expiresAt: response.expiresAt, user: response.user }, "login")
}

/** Atualiza dados da sessão atual (ex.: perfil editado, sessão revalidada) sem trocar de usuário. */
export function refreshSession(response: Partial<SessionResponse> & { user: User }) {
  if (!current) return
  replace({ ...current, ...response }, "refresh")
}

export function clearSession(reason: SessionEndReason) {
  if (!current) return
  replace(null, reason)
}

export function expireSession() {
  clearSession("expired")
}

// ---------------------------------------------------------------------------
// Carrinho de visitante
// ---------------------------------------------------------------------------

let memoryGuestCartId: string | null = null

export function getGuestCartId(): string {
  const stored = storage()?.getItem(GUEST_CART_KEY)
  if (stored) return stored
  memoryGuestCartId ??= `guest-${crypto.randomUUID()}`
  try {
    storage()?.setItem(GUEST_CART_KEY, memoryGuestCartId)
  } catch {
    // segue em memória
  }
  return memoryGuestCartId
}

/** Após o login o carrinho do visitante foi mesclado no do usuário: começa um novo. */
export function resetGuestCartId() {
  memoryGuestCartId = null
  try {
    storage()?.removeItem(GUEST_CART_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Sincronização entre abas
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== SESSION_KEY) return
    const next = read()
    if (next?.token === current?.token) return
    const previous = current
    current = next
    scheduleExpiry(next)
    emit({ previous, current: next, reason: "storage" })
  })
}
