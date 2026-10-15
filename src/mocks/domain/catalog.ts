import {
  CATALOG_TABS,
  NETWORKS,
  NFT_SORTS,
  type CatalogTab,
  type Edition,
  type Facet,
  type Network,
  type NftDetail,
  type NftListParams,
  type NftPage,
  type NftSort,
  type NftSummary,
  type NftUpdatedEvent,
} from "@/api/types"
import { compareEth, eth, isEthAmount, toEthAmount } from "@/lib/money"

import type { MockDatabase, NftRecord } from "../db/schema"
import { db, mutate } from "../db/store"
import { publish } from "../events"
import { newId } from "./ids"
import { notFound, validationError } from "./errors"

export const DEFAULT_PAGE_SIZE = 9
export const MAX_PAGE_SIZE = 48
const NEW_RELEASE_COUNT = 16
const TRENDING_THRESHOLD = 60

const NETWORK_LABELS: Record<Network, string> = { ethereum: "Ethereum", polygon: "Polygon", solana: "Solana" }

function sellable(editions: Edition[]) {
  return editions.filter((edition) => edition.status === "available")
}

export function displayPrice(nft: NftRecord) {
  const candidates = sellable(nft.editions).length > 0 ? sellable(nft.editions) : nft.editions
  return candidates.reduce((min, edition) => (compareEth(edition.priceEth, min) < 0 ? edition.priceEth : min), candidates[0].priceEth)
}

export function totalAvailable(nft: NftRecord) {
  return sellable(nft.editions).reduce((sum, edition) => sum + edition.available, 0)
}

export function findNft(id: string, data: MockDatabase = db()) {
  return data.nfts.find((nft) => nft.id === id)
}

export function requireNft(id: string, data: MockDatabase = db()) {
  const nft = findNft(id, data)
  if (!nft) throw notFound("NFT_NOT_FOUND", "NFT não encontrado.")
  return nft
}

export function toSummary(nft: NftRecord, data: MockDatabase = db()): NftSummary {
  const collection = data.collections.find((entry) => entry.id === nft.collectionId)
  return {
    id: nft.id,
    name: nft.name,
    image: nft.image,
    collection: { id: nft.collectionId, name: collection?.name ?? nft.collectionId },
    network: nft.network,
    priceEth: displayPrice(nft),
    previousPriceEth: nft.previousPriceEth,
    badge: nft.badge,
    available: totalAvailable(nft),
    version: nft.version,
    createdAt: nft.createdAt,
  }
}

export function toDetail(nft: NftRecord, data: MockDatabase = db()): NftDetail {
  return {
    ...toSummary(nft, data),
    description: nft.description,
    story: nft.story,
    tokenId: nft.tokenId,
    contract: nft.contract,
    royaltyPercent: nft.royaltyPercent,
    attributes: nft.attributes,
    rating: nft.rating,
    gallery: nft.gallery,
    creator: nft.creator,
    editions: nft.editions,
  }
}

function csv(value: string | null) {
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : []
}

export function parseListParams(search: URLSearchParams): Required<Pick<NftListParams, "sort" | "tab" | "page" | "pageSize">> & NftListParams {
  const errors: Record<string, string> = {}
  const sort = (search.get("sort") ?? "recent") as NftSort
  const tab = (search.get("tab") ?? "all") as CatalogTab
  const page = Number(search.get("page") ?? "1")
  const pageSize = Number(search.get("pageSize") ?? DEFAULT_PAGE_SIZE)
  const minPrice = search.get("minPrice") ?? undefined
  const maxPrice = search.get("maxPrice") ?? undefined
  const networks = csv(search.get("networks"))

  if (!NFT_SORTS.includes(sort)) errors.sort = "Ordenação inválida."
  if (!CATALOG_TABS.includes(tab)) errors.tab = "Aba inválida."
  if (!Number.isInteger(page) || page < 1) errors.page = "Página inválida."
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) errors.pageSize = `Use de 1 a ${MAX_PAGE_SIZE}.`
  if (minPrice !== undefined && !isEthAmount(minPrice)) errors.minPrice = "Preço mínimo inválido."
  if (maxPrice !== undefined && !isEthAmount(maxPrice)) errors.maxPrice = "Preço máximo inválido."
  if (networks.some((network) => !NETWORKS.includes(network as Network))) errors.networks = "Rede inválida."
  if (Object.keys(errors).length > 0) throw validationError(errors, "Parâmetros de busca inválidos.")

  return {
    q: search.get("q")?.trim() || undefined,
    collections: csv(search.get("collections")),
    networks: networks as Network[],
    minPrice,
    maxPrice,
    sort,
    tab,
    page,
    pageSize,
  }
}

type Filters = Pick<NftListParams, "q" | "collections" | "networks" | "minPrice" | "maxPrice" | "tab">

function matches(nft: NftRecord, filters: Filters, ranks: { newIds: Set<string> }, ignore?: "collections" | "networks") {
  if (filters.q && !nft.name.toLowerCase().includes(filters.q.toLowerCase())) return false
  if (ignore !== "collections" && filters.collections?.length && !filters.collections.includes(nft.collectionId)) return false
  if (ignore !== "networks" && filters.networks?.length && !filters.networks.includes(nft.network)) return false
  const price = displayPrice(nft)
  if (filters.minPrice && compareEth(price, filters.minPrice) < 0) return false
  if (filters.maxPrice && compareEth(price, filters.maxPrice) > 0) return false
  if (filters.tab === "new" && !ranks.newIds.has(nft.id)) return false
  if (filters.tab === "trending" && nft.trendingScore < TRENDING_THRESHOLD) return false
  return true
}

const sorters: Record<NftSort, (a: NftRecord, b: NftRecord) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  "price-asc": (a, b) => compareEth(displayPrice(a), displayPrice(b)) || a.id.localeCompare(b.id),
  "price-desc": (a, b) => compareEth(displayPrice(b), displayPrice(a)) || a.id.localeCompare(b.id),
  "name-asc": (a, b) => a.name.localeCompare(b.name, "pt-BR"),
}

export function listNfts(params: ReturnType<typeof parseListParams>, data: MockDatabase = db()): NftPage {
  const newIds = new Set([...data.nfts].sort(sorters.recent).slice(0, NEW_RELEASE_COUNT).map((nft) => nft.id))
  const ranks = { newIds }

  const filtered = data.nfts.filter((nft) => matches(nft, params, ranks)).sort(sorters[params.sort])
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize))
  const start = (params.page - 1) * params.pageSize

  const collectionFacets: Facet[] = data.collections.map((collection) => ({
    id: collection.id,
    label: collection.name,
    count: data.nfts.filter((nft) => nft.collectionId === collection.id && matches(nft, params, ranks, "collections")).length,
  }))
  const networkFacets: Facet[] = NETWORKS.map((network) => ({
    id: network,
    label: NETWORK_LABELS[network],
    count: data.nfts.filter((nft) => nft.network === network && matches(nft, params, ranks, "networks")).length,
  }))
  const prices = data.nfts.map(displayPrice).sort(compareEth)

  return {
    items: filtered.slice(start, start + params.pageSize).map((nft) => toSummary(nft, data)),
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    facets: {
      collections: collectionFacets,
      networks: networkFacets,
      priceRange: { min: prices[0], max: prices[prices.length - 1] },
    },
  }
}

export interface NftChange {
  editionId?: string
  priceEth?: string
  available?: number
  status?: Edition["status"]
}

export function updateNft(nftId: string, change: NftChange) {
  return mutate((data) => {
    const nft = requireNft(nftId, data)
    const previousPrice = displayPrice(nft)
    const targets = change.editionId ? nft.editions.filter((edition) => edition.id === change.editionId) : nft.editions
    if (targets.length === 0) throw notFound("NOT_FOUND", "Edição não encontrada.")

    for (const edition of targets) {
      if (change.priceEth !== undefined) {
        edition.priceEth = change.editionId ? change.priceEth : scaleEditionPrice(edition, previousPrice, change.priceEth)
      }
      if (change.available !== undefined) edition.available = Math.max(0, change.available)
      if (change.status !== undefined) edition.status = change.status
      else if (edition.status !== "unavailable") edition.status = edition.available > 0 ? "available" : "sold-out"
    }

    nft.version += 1
    const priceEth = displayPrice(nft)
    if (compareEth(priceEth, previousPrice) !== 0) nft.previousPriceEth = previousPrice

    const event: NftUpdatedEvent = {
      eventId: newId("evt"),
      type: "nft.updated",
      resource: { type: "nft", id: nft.id },
      version: nft.version,
      occurredAt: new Date().toISOString(),
      data: {
        priceEth,
        previousPriceEth: nft.previousPriceEth,
        available: totalAvailable(nft),
        editions: nft.editions.map(({ id, priceEth: editionPrice, available, status }) => ({
          id,
          priceEth: editionPrice,
          available,
          status,
        })),
      },
    }
    publish(event)
    return nft
  })
}

function scaleEditionPrice(edition: Edition, basePrice: string, newBasePrice: string) {
  const ratio = eth(edition.priceEth).dividedBy(basePrice)
  return toEthAmount(eth(newBasePrice).times(ratio).toDecimalPlaces(6))
}
