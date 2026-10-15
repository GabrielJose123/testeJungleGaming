import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { nftsApi } from "../endpoints"
import { queryKeys } from "../query-keys"
import type { NftListParams } from "../types"

export function normalizeListParams(params: NftListParams): NftListParams {
  const normalized: NftListParams = {}
  if (params.q?.trim()) normalized.q = params.q.trim()
  if (params.collections?.length) normalized.collections = [...params.collections].sort()
  if (params.networks?.length) normalized.networks = [...params.networks].sort()
  if (params.minPrice) normalized.minPrice = params.minPrice
  if (params.maxPrice) normalized.maxPrice = params.maxPrice
  if (params.sort && params.sort !== "recent") normalized.sort = params.sort
  if (params.tab && params.tab !== "all") normalized.tab = params.tab
  if (params.page && params.page > 1) normalized.page = params.page
  if (params.pageSize) normalized.pageSize = params.pageSize
  return normalized
}

export function useNfts(params: NftListParams) {
  const normalized = normalizeListParams(params)
  return useQuery({
    queryKey: queryKeys.nfts.list(normalized),
    queryFn: ({ signal }) => nftsApi.list(normalized, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useNft(nftId: string) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => nftsApi.detail(nftId, { signal }),
    staleTime: 30_000,
  })
}
