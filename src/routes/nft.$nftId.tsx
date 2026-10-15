import { createFileRoute } from "@tanstack/react-router"

import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"

export const Route = createFileRoute("/nft/$nftId")({
  component: () => <ScreenPlaceholder title="Detalhes do NFT" />,
})
