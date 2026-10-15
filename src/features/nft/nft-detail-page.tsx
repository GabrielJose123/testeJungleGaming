import { getRouteApi, Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router"
import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useAddToCart } from "@/api/hooks/cart"
import { useNft } from "@/api/hooks/catalog"
import { useIsFavorite, useToggleFavorite } from "@/api/hooks/favorites"
import type { NftDetail } from "@/api/types"
import { ErrorState } from "@/components/feedback"
import { Breadcrumb, QuantityStepper, Shimmer } from "@/components/kit"
import { buttonStyles } from "@/components/kit-styles"
import { PageShell } from "@/components/layout/page-shell"
import { RelatedNfts } from "@/components/nft/related-nfts"
import { errorMessage } from "@/lib/error-message"
import { compareEth, formatEth } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useSession } from "@/session/use-session"

const route = getRouteApi("/nft/$nftId")

const NETWORK_LABEL = { ethereum: "Ethereum", polygon: "Polygon", solana: "Solana" } as const

export function NftDetailPage() {
  const { nftId } = route.useParams()
  const nft = useNft(nftId)

  return (
    <PageShell nav="market" mobileTab={null}>
      <Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/" }]} />
      {nft.isPending ? (
        <DetailSkeleton />
      ) : nft.isError ? (
        isApiError(nft.error, "NFT_NOT_FOUND") ? (
          <div className="flex flex-col items-start gap-4 py-16">
            <h1 className="text-heading font-bold text-cream">NFT não encontrado</h1>
            <p className="text-body text-sand">Este NFT não existe ou foi removido.</p>
            <Link to="/" className={cn(buttonStyles.primary, "h-10")}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <ErrorState error={nft.error} onRetry={() => void nft.refetch()} className="py-16" />
        )
      ) : (
        <NftDetailContent nft={nft.data} />
      )}
      <RelatedNfts title="Mais desta coleção" collectionId={nft.data?.collection.id} excludeId={nftId} className="mt-24 hidden lg:flex" />
    </PageShell>
  )
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="grid gap-8 lg:grid-cols-[100px_395px_1fr] lg:gap-6">
      <div className="hidden flex-col gap-4 lg:flex">
        {Array.from({ length: 4 }, (_, index) => (
          <Shimmer key={index} className="size-[100px]" />
        ))}
      </div>
      <Shimmer className="aspect-square w-full" />
      <div className="flex flex-col gap-4">
        <Shimmer className="h-8 w-2/3" />
        <Shimmer className="h-6 w-1/3" />
        <Shimmer className="h-24 w-full" />
        <Shimmer className="h-10 w-1/2" />
      </div>
    </div>
  )
}

function Stars({ average }: { average: number }) {
  return (
    <span aria-hidden className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <img key={index} src={`/assets/icons/star-${index < Math.round(average) ? "filled" : "empty"}.svg`} alt="" width={14} height={14} />
      ))}
    </span>
  )
}

function NftDetailContent({ nft }: { nft: NftDetail }) {
  const session = useSession()
  const navigate = useNavigate()
  const router = useRouter()
  const href = useRouterState({ select: (state) => state.location.href })
  const addToCart = useAddToCart()
  const isFavorite = useIsFavorite(nft.id)
  const toggleFavorite = useToggleFavorite()
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [tab, setTab] = useState<"details" | "reviews">("details")

  const cheapest = nft.editions.filter((edition) => edition.status === "available").sort((a, b) => compareEth(a.priceEth, b.priceEth))[0]
  const selected = nft.editions.find((edition) => edition.id === editionId) ?? cheapest
  const limit = selected ? Math.min(selected.available, selected.maxPerOrder) : 0
  const gallery = nft.gallery.length ? nft.gallery : [nft.image]
  const price = selected?.priceEth ?? nft.priceEth

  const favorite = () => {
    if (!session) void navigate({ to: "/entrar", search: { redirect: href } })
    else toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite })
  }
  const buy = () => selected && addToCart.mutate({ nftId: nft.id, editionId: selected.id, quantity })

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[100px_minmax(0,445px)_1fr] lg:gap-7">
        <ul className="order-2 hidden flex-col gap-4 lg:order-none lg:flex" aria-label="Galeria">
          {gallery.slice(0, 4).map((image, index) => (
            <li key={`${image}-${index}`}>
              <button
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Ver imagem ${index + 1}`}
                aria-current={activeImage === index}
                className={cn("block rounded-xs outline-offset-2", activeImage === index && "outline-2 outline-brand")}
              >
                <img src={image} alt="" width={100} height={100} className="size-[100px] rounded-xs object-cover" />
              </button>
            </li>
          ))}
        </ul>

        <div className="relative -mx-6 -mt-4 lg:mx-0 lg:mt-0 lg:bg-surface-card lg:p-5">
          <div className="absolute top-2 right-6 left-6 z-10 flex justify-between lg:hidden">
            <button type="button" onClick={() => router.history.back()} aria-label="Voltar" className="flex size-9 items-center justify-center rounded-full border border-line-soft bg-ink/60 text-cream">
              ‹
            </button>
            <button
              type="button"
              onClick={favorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar"}
              className={cn("flex size-9 items-center justify-center rounded-full border border-line-soft bg-ink/60", isFavorite ? "text-amber" : "text-sand")}
            >
              ♥
            </button>
          </div>
          <img
            src={gallery[activeImage] ?? nft.image}
            alt={nft.name}
            width={405}
            height={405}
            fetchPriority="high"
            className="aspect-square w-full rounded-3xl object-cover px-6 pt-12 lg:px-0 lg:pt-0"
          />
          <img src="/assets/icons/zoom-button.svg" alt="" aria-hidden width={32} height={32} className="absolute top-2 right-2 hidden lg:block" />
        </div>

        <div className="-mx-6 flex flex-col gap-4 rounded-t-4xl bg-surface-card px-6 pt-6 pb-40 lg:mx-0 lg:rounded-none lg:bg-transparent lg:p-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-title-lg leading-8 font-bold text-cream lg:text-heading-lg">{nft.name}</h1>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-brand px-2 py-1 text-caption text-cream lg:hidden">
              ★ {nft.rating.average.toFixed(1)} ({nft.rating.count})
            </span>
          </div>
          <div className="hidden items-center justify-between border-b border-line pb-3 lg:flex">
            <p className="text-title-lg font-bold text-amber">{formatEth(price)}</p>
            <p className="flex items-center gap-2 text-body text-cream">
              <Stars average={nft.rating.average} />
              <span>
                <span className="sr-only">Nota {nft.rating.average.toFixed(1)} de 5, </span>
                {nft.rating.count} avaliações de colecionadores
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="hidden text-body font-bold text-cream lg:block">Sobre este NFT:</h2>
            <p className="text-body leading-6 text-sand">{nft.description}</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-body font-bold text-cream">Edição:</legend>
            <div className="flex flex-wrap gap-2">
              {nft.editions.map((edition) => {
                const disabled = edition.status !== "available"
                return (
                  <label
                    key={edition.id}
                    className={cn(
                      "cursor-pointer rounded-full border px-2 py-0.5 text-caption has-focus-visible:outline-2 has-focus-visible:outline-amber",
                      selected?.id === edition.id ? "border-brand text-cream" : "border-line-soft text-sand",
                      disabled && "cursor-not-allowed line-through opacity-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="edition"
                      value={edition.id}
                      className="sr-only"
                      checked={selected?.id === edition.id}
                      disabled={disabled}
                      onChange={() => {
                        setEditionId(edition.id)
                        setQuantity(1)
                      }}
                    />
                    {edition.label.toUpperCase()}
                    <span className="sr-only">
                      {" "}
                      — {formatEth(edition.priceEth)}, {disabled ? "esgotada" : `${edition.available} disponível(is), máximo ${edition.maxPerOrder} por pedido`}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-4xl bg-surface-raised px-6 pt-5 pb-6 lg:static lg:flex-row lg:items-center lg:justify-between lg:bg-transparent lg:p-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body text-cream lg:hidden">Qtd.</span>
              <QuantityStepper value={quantity} max={limit} onChange={setQuantity} disabled={!selected} label={nft.name} />
              <span className="ml-auto text-title-lg font-bold text-amber lg:hidden">{formatEth(price)}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={buy}
                disabled={!selected || addToCart.isPending}
                className={cn(buttonStyles.primary, "h-14 flex-1 rounded-full text-body-lg lg:h-9 lg:w-[116px] lg:flex-none lg:rounded-xs lg:text-caption")}
              >
                {addToCart.isPending ? "Adicionando…" : selected ? "Comprar" : "Esgotado"}
              </button>
              <button
                type="button"
                onClick={favorite}
                aria-pressed={isFavorite}
                disabled={toggleFavorite.isPending}
                className={cn(buttonStyles.outline, "hidden h-9 text-body lg:inline-flex", isFavorite && "bg-surface-card")}
              >
                <img src="/assets/icons/heart-outline-accent.svg" alt="" width={18} height={18} />
                {isFavorite ? "Favoritado" : "Favoritar"}
              </button>
              <Link to="/carrinho" aria-label="Ver carrinho" className="flex size-14 items-center justify-center rounded-full bg-surface-card lg:hidden">
                <img src="/assets/icons/cart.svg" alt="" width={20} height={20} />
              </Link>
            </div>
            <div role="status" aria-live="polite" className="text-caption lg:absolute lg:hidden">
              {addToCart.isSuccess && <span className="text-cream">Adicionado ao carrinho.</span>}
              {addToCart.isError && <span className="text-danger">{errorMessage(addToCart.error)}</span>}
            </div>
          </div>
          <div role="status" aria-live="polite" className="hidden text-body lg:block">
            {addToCart.isSuccess && (
              <p className="text-cream">
                Adicionado ao carrinho.{" "}
                <Link to="/carrinho" className="text-amber underline">
                  Ver carrinho
                </Link>
              </p>
            )}
            {addToCart.isError && <p className="text-danger">{errorMessage(addToCart.error)}</p>}
            {toggleFavorite.isError && <p className="text-danger">Não foi possível atualizar os favoritos. {errorMessage(toggleFavorite.error)}</p>}
          </div>

          <dl className="flex flex-col gap-3 text-body text-brand-muted">
            <div className="flex gap-1">
              <dt>ID do token:</dt>
              <dd>{nft.tokenId}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Coleção:</dt>
              <dd>{nft.collection.name}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Atributos:</dt>
              <dd>{nft.attributes.join(", ")}</dd>
            </div>
          </dl>
          <p className="hidden items-center gap-2 text-body font-bold text-cream lg:flex">
            Compartilhar este NFT:
            <img src="/assets/icons/share-linkedin.svg" alt="LinkedIn" width={16} height={16} />
            <img src="/assets/icons/message.svg" alt="E-mail" width={14} height={14} />
            <img src="/assets/icons/share-twitter.svg" alt="Twitter" width={16} height={16} />
          </p>
        </div>
      </div>

      <section className="mt-20 hidden lg:block">
        <div role="tablist" aria-label="Informações do NFT" className="flex gap-8 border-b border-line">
          {(
            [
              ["details", "Detalhes do NFT"],
              ["reviews", `Avaliações de colecionadores (${nft.rating.count})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={cn("-mb-px border-b-2 pb-2 text-body-lg", tab === id ? "border-brand font-bold text-amber" : "border-transparent text-cream")}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-4 pt-4 text-body leading-6 text-sand">
          {tab === "details" ? (
            <>
              {nft.story.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <dl className="flex flex-col gap-3">
                <dt className="font-bold text-cream">Rede:</dt>
                <dd>Cunhado na {NETWORK_LABEL[nft.network]} com procedência imutável e metadados armazenados no IPFS.</dd>
                <dt className="font-bold text-cream">Contrato:</dt>
                <dd>Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
                <dt className="font-bold text-cream">Direitos autorais:</dt>
                <dd>{nft.contract} • Contrato inteligente ERC-721 verificado.</dd>
              </dl>
            </>
          ) : (
            <p>
              Nota média {nft.rating.average.toFixed(1)} de 5 em {nft.rating.count} avaliações.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
