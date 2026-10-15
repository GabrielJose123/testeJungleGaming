import { couponFixtures, favoriteFixtures, userFixtures, walletFixtures } from "../fixtures/accounts"
import { buildNftFixtures, collections } from "../fixtures/nfts"
import type { MockDatabase } from "./schema"

/**
 * Banco em memória do servidor simulado, persistido em localStorage para sobreviver a refresh.
 * `resetDatabase()` restaura integralmente o cenário conhecido (fixtures).
 */

const STORAGE_KEY = "kurio:mock-db"
const SCHEMA_VERSION = 1

export function createSeedDatabase(): MockDatabase {
  return {
    schemaVersion: SCHEMA_VERSION,
    collections: structuredClone(collections),
    nfts: buildNftFixtures(),
    users: structuredClone(userFixtures),
    sessions: [],
    carts: [],
    coupons: structuredClone(couponFixtures),
    favorites: structuredClone(favoriteFixtures),
    quotes: [],
    orders: [],
    idempotency: [],
    wallets: structuredClone(walletFixtures),
    orderSequence: 1000,
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage
  } catch {
    return null
  }
}

function load(): MockDatabase {
  const raw = storage()?.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDatabase
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    } catch {
      // Conteúdo corrompido: recomeça do seed.
    }
  }
  return createSeedDatabase()
}

let database: MockDatabase | null = null

export function db(): MockDatabase {
  database ??= load()
  return database
}

export function persist() {
  if (!database) return
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(database))
  } catch {
    // Cota excedida ou storage bloqueado: segue só em memória.
  }
}

/** Aplica uma mutação e persiste. */
export function mutate<T>(change: (data: MockDatabase) => T): T {
  const result = change(db())
  persist()
  return result
}

export function resetDatabase() {
  database = createSeedDatabase()
  persist()
}

/** Substitui o banco (usado pelos testes unitários). */
export function setDatabase(next: MockDatabase) {
  database = next
}
