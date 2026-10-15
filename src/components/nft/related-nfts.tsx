import { useNfts } from "@/api/hooks/catalog"
import { SectionHeading, Shimmer } from "@/components/kit"
import { cn } from "@/lib/utils"

import { NftCard } from "./nft-card"

export function RelatedNfts({ title, collectionId, excludeId, className }: { title: string; collectionId?: string; excludeId?: string; className?: string }) {
  const related = useNfts({ collections: collectionId ? [collectionId] : undefined, pageSize: 6 })
  const items = (related.data?.items ?? []).filter((nft) => nft.id !== excludeId).slice(0, 5)

  return (
    <section aria-labelledby="related-title" className={cn("flex flex-col gap-8", className)}>
      <SectionHeading id="related-title">{title}</SectionHeading>
      <ul className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-6 lg:overflow-visible lg:px-0">
        {related.isPending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="w-[180px] shrink-0 snap-start lg:w-auto">
                <Shimmer className="aspect-[4/5] w-full" />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="w-[180px] shrink-0 snap-start lg:w-auto">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
