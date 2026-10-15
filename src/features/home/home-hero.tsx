import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import type { NftSummary } from "@/types/catalog"

interface HomeHeroProps {
  nft: NftSummary
  secondaryNft: NftSummary
  className?: string
}

export function HomeHero({ nft, secondaryNft, className }: HomeHeroProps) {
  return (
    <section aria-label="Destaque" className={className}>
      <DesktopHero nft={nft} />
      <MobileHero nft={nft} secondaryNft={secondaryNft} />
    </section>
  )
}

function DesktopHero({ nft }: { nft: NftSummary }) {
  return (
    <div className="relative hidden h-[450px] items-center overflow-hidden rounded-4xl bg-surface-card pl-10 lg:flex">
      <div className="flex w-full items-center justify-between">
        <div className="flex w-[600px] flex-col items-end gap-11">
          <div className="flex w-full flex-col items-start gap-8">
            <div className="flex w-full flex-col gap-1">
              <div className="flex flex-col gap-2 text-cream">
                <p className="text-body font-medium tracking-[1.4px]">Bem-vindo à Kurio</p>
                <h1 className="text-display font-bold">
                  SEJA DONO DO FUTURO
                  <br />
                  DA ARTE DIGITAL
                </h1>
              </div>
              <p className="w-[557px] text-body leading-6 text-sand">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
                artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <Link
              to="/"
              hash="catalogo"
              className="flex h-10 w-[140px] items-center justify-center rounded-sm bg-brand pr-9 pl-7 text-body-lg leading-5 font-bold text-ink hover:bg-amber"
            >
              EXPLORAR
            </Link>
          </div>
          <CarouselDots src="/assets/icons/hero-dots.svg" width={40} height={8} />
        </div>
        <img
          src={nft.image}
          alt={nft.name}
          width={450}
          height={450}
          fetchPriority="high"
          className="size-[450px] shrink-0 rounded-4xl object-cover"
        />
      </div>
    </div>
  )
}

function MobileHero({ nft, secondaryNft }: { nft: NftSummary; secondaryNft: NftSummary }) {
  return (
    <div className="relative flex h-[190px] flex-col items-center justify-center overflow-hidden rounded-xl p-4 lg:hidden">
      <img
        src="/assets/icons/hero-mask-mobile.svg"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full max-w-none object-cover"
      />
      <div className="relative flex w-full flex-col items-center gap-4">
        <div className="flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-col gap-1.5">
              <p className="text-caption font-medium text-cream">Bem-vindo à Kurio</p>
              <h1 className="w-[190px] max-w-full text-title leading-[29px] font-bold text-cream">
                SEJA DONO DA
                <br />
                CULTURA DIGITAL
              </h1>
              <p className="text-caption leading-[18px] text-sand">Descubra NFTs selecionados de criadores do mundo todo.</p>
            </div>
            <Link
              to="/"
              hash="catalogo"
              className="flex items-center gap-2 self-start rounded-xs text-caption leading-3.5 font-bold text-amber"
            >
              EXPLORAR
              <span className="relative size-4">
                <span className="absolute inset-[23.76%_17.71%_26.04%_19.79%] flex items-center justify-center">
                  <img
                    src="/assets/icons/arrow-right-accent.svg"
                    alt=""
                    className="block h-[10px] w-[8px] max-w-none -rotate-90"
                  />
                </span>
              </span>
            </Link>
          </div>
          <div className="relative size-[138px] shrink-0">
            <img
              src={nft.image}
              alt={nft.name}
              width={138}
              height={138}
              fetchPriority="high"
              className="size-[138px] rounded-2xl object-cover"
            />
            <img
              src={secondaryNft.image}
              alt={secondaryNft.name}
              width={58}
              height={58}
              className="absolute top-[88px] left-[14px] size-[58px] rounded-2xl object-cover"
            />
          </div>
        </div>
        <CarouselDots src="/assets/icons/hero-dots-mobile.svg" width={33} height={7} />
      </div>
    </div>
  )
}

function CarouselDots({ src, width, height, className }: { src: string; width: number; height: number; className?: string }) {
  return <img src={src} alt="" aria-hidden width={width} height={height} className={cn("block", className)} />
}
