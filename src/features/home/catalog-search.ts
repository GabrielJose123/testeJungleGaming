import { z } from "zod"

import { CATALOG_TABS, NETWORKS, NFT_SORTS, type NftListParams } from "@/api/types"
import { isEthAmount } from "@/lib/money"

const list = <T extends z.ZodType<string>>(item: T) =>
  z
    .preprocess((value) => (typeof value === "string" ? value.split(",").filter(Boolean) : value), z.array(item))
    .catch([])

const ethAmount = z
  .preprocess((value) => (typeof value === "number" ? String(value) : value), z.string().refine(isEthAmount))
  .optional()
  .catch(undefined)

export const catalogSearchSchema = z.object({
  q: z
    .preprocess((value) => (typeof value === "number" ? String(value) : value), z.string().trim().max(80))
    .optional()
    .catch(undefined),
  collections: list(z.string().regex(/^[\w-]+$/)).optional(),
  networks: list(z.enum(NETWORKS as [string, ...string[]])).optional(),
  minPrice: ethAmount,
  maxPrice: ethAmount,
  sort: z.enum(NFT_SORTS as [string, ...string[]]).optional().catch(undefined),
  tab: z.enum(CATALOG_TABS as [string, ...string[]]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9

export function toListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q,
    collections: search.collections,
    networks: search.networks as NftListParams["networks"],
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: (search.sort ?? "recent") as NftListParams["sort"],
    tab: (search.tab ?? "all") as NftListParams["tab"],
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function withFilters(search: CatalogSearch, patch: Partial<Omit<CatalogSearch, "page">>): CatalogSearch {
  const next: CatalogSearch = { ...search, ...patch, page: undefined }
  for (const key of Object.keys(next) as Array<keyof CatalogSearch>) {
    const value = next[key]
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete next[key]
  }
  return next
}

export function toggleValue(values: string[] | undefined, value: string) {
  const current = values ?? []
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
}
