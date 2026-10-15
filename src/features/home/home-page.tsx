import { useState } from "react"

import { PageShell } from "@/components/layout/page-shell"
import { NftCard } from "@/components/nft/nft-card"
import { Pagination } from "@/components/pagination"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  blogPosts,
  catalogNfts,
  catalogTabs,
  collectionFilters,
  featuredNft,
  networkFilters,
  priceBounds,
  promoCards,
  sortOptions,
} from "@/lib/placeholder-data"
import type { PriceRange } from "@/types/catalog"

import { BlogSection } from "./blog-section"
import { CatalogFilters } from "./catalog-filters"
import { CatalogTabs, SortSelect } from "./catalog-toolbar"
import { FeaturedBanner } from "./featured-banner"
import { HomeHero } from "./home-hero"
import { FilterIconButton, MobileSearchBar } from "./mobile-search-bar"
import { PromoCards } from "./promo-cards"

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id])

/** Tela Início — Figma: Desktop / Início (2:2) e Mobile / Início (14:5226). */
export function HomePage() {
  // Estado apenas visual. Busca, filtros, ordenação e página vão para a URL quando a API existir.
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<string>(catalogTabs[0].id)
  const [sort, setSort] = useState<string>(sortOptions[0].id)
  const [page, setPage] = useState(1)
  const [collections, setCollections] = useState<string[]>(["arte-digital"])
  const [networks, setNetworks] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: priceBounds.min, max: priceBounds.max })

  const filters = (
    <CatalogFilters
      collections={collectionFilters}
      networks={networkFilters}
      selectedCollections={collections}
      selectedNetworks={networks}
      priceBounds={priceBounds}
      priceRange={priceRange}
      onToggleCollection={(id) => setCollections((current) => toggle(current, id))}
      onToggleNetwork={(id) => setNetworks((current) => toggle(current, id))}
      onPriceRangeChange={setPriceRange}
    />
  )

  return (
    <PageShell nav="home" headerDivider mobileTab="home" className="gap-4 lg:gap-24">
      <MobileSearchBar
        value={search}
        onValueChange={setSearch}
        className="lg:hidden"
        filterTrigger={
          <Sheet>
            <SheetTrigger asChild>
              <FilterIconButton />
            </SheetTrigger>
            <SheetContent side="right" className="w-[88%] gap-0 overflow-y-auto border-line bg-ink p-0">
              <SheetHeader className="px-5 pt-5">
                <SheetTitle className="text-heading font-bold text-cream">Filtros</SheetTitle>
                <SheetDescription className="text-body text-sand">Refine o catálogo por coleção, preço e rede.</SheetDescription>
              </SheetHeader>
              <SortSelect options={sortOptions} value={sort} onValueChange={setSort} className="px-5 py-4" />
              {filters}
            </SheetContent>
          </Sheet>
        }
      />

      <HomeHero nft={catalogNfts[0]} secondaryNft={catalogNfts[1]} />

      <section id="catalogo" aria-labelledby="catalogo-title" className="flex scroll-mt-6 gap-12">
        <h2 id="catalogo-title" className="sr-only">
          Catálogo de NFTs
        </h2>
        <aside aria-label="Filtros" className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
          {filters}
          <FeaturedBanner nft={featuredNft} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col items-end gap-[88px]">
          <div className="flex w-full flex-col gap-4 lg:gap-8">
            <div className="flex items-center justify-between overflow-x-auto">
              <CatalogTabs tabs={catalogTabs} activeTab={tab} onTabChange={setTab} />
              <SortSelect options={sortOptions} value={sort} onValueChange={setSort} className="hidden lg:flex" />
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 max-sm:[&>li:nth-child(even)]:translate-y-8 sm:grid-cols-3 sm:pb-0 lg:grid-cols-[repeat(3,258px)] lg:justify-between lg:gap-y-[72px]">
              {catalogNfts.map((nft, index) => (
                <li key={nft.id}>
                  <NftCard nft={nft} priority={index < 2} />
                </li>
              ))}
            </ul>
          </div>

          <Pagination page={page} pageCount={4} onPageChange={setPage} className="mt-10 self-center lg:mt-0 lg:self-end" />
        </div>
      </section>

      <PromoCards promos={promoCards} className="mt-12 lg:mt-0" />
      <BlogSection posts={blogPosts} className="mt-12 lg:mt-0" />
    </PageShell>
  )
}
