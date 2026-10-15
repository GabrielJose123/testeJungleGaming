import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import type { NftSummary } from "@/types/catalog"

export function FeaturedBanner({ nft, className }: { nft: NftSummary; className?: string }) {
  return (
    <section
      aria-labelledby="destaque-title"
      className={cn("relative flex h-[470px] w-[310px] overflow-hidden bg-featured-gradient pt-6 pb-1", className)}
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col items-center gap-4 px-5">
          <h2 id="destaque-title" className="w-full text-heading font-bold text-amber">
            NFT EM DESTAQUE
          </h2>
          <p className="w-full text-center text-title-lg font-bold text-cream">OFERTA LIMITADA</p>
        </div>
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block rounded-[22px]">
          <img
            src={nft.image}
            alt={nft.name}
            width={310}
            height={368}
            loading="lazy"
            className="h-[368px] w-full rounded-[22px] object-cover"
          />
        </Link>
      </div>
      <span aria-hidden className="absolute top-[299px] left-4 size-[22px] rounded-[7px] border-2 border-success opacity-20" />
      <span aria-hidden className="absolute top-[343px] left-[248px] size-[45px] rounded-[29px] bg-bubble-gradient" />
      <span aria-hidden className="absolute top-[105px] left-[38px] size-[15px] rounded-[29px] bg-bubble-gradient" />
    </section>
  )
}
