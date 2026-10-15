import { getRouteApi } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { useNfts } from "@/api/hooks/catalog"
import { ErrorState, LoadingState } from "@/components/feedback"
import { PageShell } from "@/components/layout/page-shell"
import { NftCard } from "@/components/nft/nft-card"
import { Pagination } from "@/components/pagination"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { blogPosts, catalogNfts, catalogTabs, featuredNft, promoCards, sortOptions } from "@/lib/placeholder-data"
import type { PriceRange } from "@/types/catalog"

import { BlogSection } from "./blog-section"
import { CatalogFilters } from "./catalog-filters"
import { toListParams, toggleValue, withFilters, type CatalogSearch } from "./catalog-search"
import { CatalogTabs, SortSelect } from "./catalog-toolbar"
import { FeaturedBanner } from "./featured-banner"
import { HomeHero } from "./home-hero"
import { FilterIconButton, MobileSearchBar } from "./mobile-search-bar"
import { PromoCards } from "./promo-cards"

const route = getRouteApi("/")
const SEARCH_DEBOUNCE_MS = 300

/**
 * Tela Início — Figma: Desktop / Início (2:2) e Mobile / Início (14:5226).
 * Busca, filtros, ordenação e página vivem na URL (refresh e histórico restauram o estado);
 * o catálogo vem da API via TanStack Query.
 */
export function HomePage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const catalog = useNfts(toListParams(search))

  const update = (next: CatalogSearch, replace = false) => void navigate({ search: next, replace, resetScroll: false })
  const setFilters = (patch: Partial<Omit<CatalogSearch, "page">>, replace = false) => update(withFilters(search, patch), replace)

  // Busca digitada: aplica com debounce e sem empilhar uma entrada de histórico por tecla.
  const [query, setQuery] = useState(search.q ?? "")
  const [syncedQuery, setSyncedQuery] = useState(search.q)
  if (search.q !== syncedQuery) {
    // A URL mudou por fora (histórico, link): o campo acompanha.
    setSyncedQuery(search.q)
    setQuery(search.q ?? "")
  }
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === (search.q ?? "")) return
    const timer = setTimeout(
      () => void navigate({ search: withFilters(search, { q: trimmed || undefined }), replace: true, resetScroll: false }),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [query, search, navigate])

  const facets = catalog.data?.facets
  const priceBounds: PriceRange = {
    min: Number(facets?.priceRange.min ?? 0),
    max: Number(facets?.priceRange.max ?? 0),
  }
  const [priceDraft, setPriceDraft] = useState<PriceRange | null>(null)
  const priceRange: PriceRange = priceDraft ?? {
    min: search.minPrice ? Number(search.minPrice) : priceBounds.min,
    max: search.maxPrice ? Number(search.maxPrice) : priceBounds.max,
  }

  const filters = (
    <CatalogFilters
      collections={facets?.collections ?? []}
      networks={facets?.networks ?? []}
      selectedCollections={search.collections ?? []}
      selectedNetworks={search.networks ?? []}
      priceBounds={priceBounds}
      priceRange={priceRange}
      onToggleCollection={(id) => setFilters({ collections: toggleValue(search.collections, id) })}
      onToggleNetwork={(id) => setFilters({ networks: toggleValue(search.networks, id) })}
      onPriceRangeChange={setPriceDraft}
      onApplyPrice={() => {
        setFilters({ minPrice: priceRange.min.toFixed(2), maxPrice: priceRange.max.toFixed(2) })
        setPriceDraft(null)
      }}
    />
  )

  const sort = search.sort ?? "recent"
  const sortSelect = (className: string) => (
    <SortSelect options={sortOptions} value={sort} onValueChange={(value) => setFilters({ sort: value === "recent" ? undefined : value })} className={className} />
  )

  return (
    <PageShell nav="home" headerDivider mobileTab="home" className="gap-4 lg:gap-24">
      <MobileSearchBar
        value={query}
        onValueChange={setQuery}
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
              {sortSelect("px-5 py-4")}
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
              <CatalogTabs
                tabs={catalogTabs}
                activeTab={search.tab ?? "all"}
                onTabChange={(tab) => setFilters({ tab: tab === "all" ? undefined : tab })}
              />
              {sortSelect("hidden lg:flex")}
            </div>

            <div aria-live="polite" aria-busy={catalog.isFetching} className="w-full">
              {catalog.isPending && <LoadingState label="Carregando catálogo…" />}
              {catalog.isError && <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} />}
              {catalog.data && catalog.data.items.length === 0 && (
                <p className="text-body text-sand">Nenhum NFT encontrado com esses filtros.</p>
              )}
            </div>

            {catalog.data && catalog.data.items.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-6 pb-8 max-sm:[&>li:nth-child(even)]:translate-y-8 sm:grid-cols-3 sm:pb-0 lg:grid-cols-[repeat(3,258px)] lg:justify-between lg:gap-y-[72px]">
                {catalog.data.items.map((nft, index) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} priority={index < 2} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {catalog.data && catalog.data.totalPages > 1 && (
            <Pagination
              page={catalog.data.page}
              pageCount={catalog.data.totalPages}
              onPageChange={(page) => update({ ...search, page: page > 1 ? page : undefined })}
              className="mt-10 self-center lg:mt-0 lg:self-end"
            />
          )}
        </div>
      </section>

      <PromoCards promos={promoCards} className="mt-12 lg:mt-0" />
      <BlogSection posts={blogPosts} className="mt-12 lg:mt-0" />
    </PageShell>
  )
}
