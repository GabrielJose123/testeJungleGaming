import { couponFixtures, favoriteFixtures, userFixtures, walletFixtures } from "../fixtures/accounts"
import { buildNftFixtures, collections } from "../fixtures/nfts"
import type { MockDatabase } from "./schema"

const STORAGE_KEY = "kurio:mock-db"
const SCHEMA_VERSION = 2

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
  }
}

export function mutate<T>(change: (data: MockDatabase) => T): T {
  const result = change(db())
  persist()
  return result
}

export function resetDatabase() {
  database = createSeedDatabase()
  persist()
}

export function setDatabase(next: MockDatabase) {
  database = next
}
