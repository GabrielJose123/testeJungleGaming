import { createFileRoute } from "@tanstack/react-router"

import { queryKeys } from "@/api/query-keys"
import { nftsApi } from "@/api/endpoints"
import { NftDetailPage } from "@/features/nft/nft-detail-page"

export const Route = createFileRoute("/nft/$nftId")({
  loader: ({ context, params }) =>
    context.queryClient
      .prefetchQuery({ queryKey: queryKeys.nfts.detail(params.nftId), queryFn: ({ signal }) => nftsApi.detail(params.nftId, { signal }) }),
  component: NftDetailPage,
})
