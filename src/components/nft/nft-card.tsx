import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import type { NftSummary } from "@/types/catalog"

import { FavoriteButton } from "./favorite-button"

interface NftCardProps {
  nft: NftSummary
  /** Imagens acima da dobra carregam com prioridade. */
  priority?: boolean
  className?: string
}

/**
 * Figma: card de produto. Desktop (lg+): moldura plana 258 × 300 com arte 250 px.
 * Mobile: moldura com gradiente, raio 20 e arte 168 px, com favorito e selo.
 */
export function NftCard({ nft, priority = false, className }: NftCardProps) {
  return (
    <article className={cn("group relative flex flex-col gap-2 lg:gap-3", className)}>
      <div className="relative rounded-3xl bg-card-gradient px-1 pt-3 pb-5 lg:h-[300px] lg:rounded-none lg:bg-none lg:bg-surface-card lg:pt-6 lg:pb-[26px]">
        <div className="relative">
          <img
            src={nft.image}
            alt=""
            width={250}
            height={250}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="aspect-square w-full rounded-2xl object-cover lg:rounded-art"
          />
          <FavoriteButton nftName={nft.name} className="absolute top-0 right-2 lg:hidden" />
        </div>
        {nft.badge && (
          <span className="absolute top-4 left-0 flex h-8 w-[68px] items-center pl-2 text-caption-lg leading-4 font-medium text-ink lg:hidden">
            <span aria-hidden className="absolute inset-0 bg-brand" />
            <span className="relative">{nft.badge}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col pl-2 lg:gap-1.5 lg:pl-0">
        <h3 className="text-body-md leading-normal text-cream lg:text-body-lg lg:leading-4">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="rounded-xs after:absolute after:inset-0 after:content-[''] hover:text-amber"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex items-center gap-3 text-body-lg leading-4 font-bold text-amber lg:text-title">
          <span>
            <span className="sr-only">Preço: </span>
            {nft.priceEth} ETH
          </span>
          {nft.previousPriceEth && (
            <s className="font-normal text-brand-muted no-underline">
              <span className="sr-only">Preço anterior: </span>
              {nft.previousPriceEth} ETH
            </s>
          )}
        </p>
      </div>
    </article>
  )
}
