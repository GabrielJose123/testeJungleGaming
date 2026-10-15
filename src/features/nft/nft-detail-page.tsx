import { getRouteApi, Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useAddToCart } from "@/api/hooks/cart"
import { useNft } from "@/api/hooks/catalog"
import { useIsFavorite, useToggleFavorite } from "@/api/hooks/favorites"
import { ErrorState, LoadingState } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/error-message"
import { compareEth, formatEth } from "@/lib/money"
import { useSession } from "@/session/use-session"

const route = getRouteApi("/nft/$nftId")

const STATUS_TEXT = { available: "disponível", "sold-out": "esgotada", unavailable: "indisponível" } as const

/** Detalhe provisório: edição, quantidade (limitada), favoritos e compra. */
export function NftDetailPage() {
  const { nftId } = route.useParams()
  const nft = useNft(nftId)
  const session = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const addToCart = useAddToCart()
  const isFavorite = useIsFavorite(nftId)
  const toggleFavorite = useToggleFavorite()
  const [editionId, setEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  if (nft.isPending) return <ScreenPlaceholder title="Detalhes do NFT"><LoadingState /></ScreenPlaceholder>
  if (nft.isError) {
    if (isApiError(nft.error, "NFT_NOT_FOUND")) {
      return (
        <ScreenPlaceholder title="NFT não encontrado">
          <p>Este NFT não existe ou foi removido.</p>
          <Link to="/" className="text-amber underline">
            Ver catálogo
          </Link>
        </ScreenPlaceholder>
      )
    }
    return (
      <ScreenPlaceholder title="Detalhes do NFT">
        <ErrorState error={nft.error} onRetry={() => void nft.refetch()} />
      </ScreenPlaceholder>
    )
  }

  const data = nft.data
  // Padrão: a edição disponível mais barata (a mesma do preço exibido no catálogo).
  const cheapest = data.editions
    .filter((edition) => edition.status === "available")
    .sort((a, b) => compareEth(a.priceEth, b.priceEth))[0]
  const selected = data.editions.find((edition) => edition.id === editionId) ?? cheapest
  const limit = selected ? Math.min(selected.available, selected.maxPerOrder) : 0

  return (
    <ScreenPlaceholder title={data.name}>
      <img src={data.image} alt={data.name} width={300} height={300} className="size-[300px] rounded-4xl object-cover" />
      <p>
        {formatEth(data.priceEth)} · {data.collection.name} · {data.available} disponível(is)
      </p>
      <p>{data.description}</p>

      <fieldset className="flex flex-col gap-1">
        <legend className="font-bold text-cream">Edição</legend>
        {data.editions.map((edition) => (
          <label key={edition.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="edition"
              value={edition.id}
              checked={selected?.id === edition.id}
              disabled={edition.status !== "available"}
              onChange={() => {
                setEditionId(edition.id)
                setQuantity(1)
              }}
            />
            {edition.label} — {formatEth(edition.priceEth)} ({STATUS_TEXT[edition.status]}, {edition.available} em estoque, máx. {edition.maxPerOrder})
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2">
        Quantidade
        <input
          type="number"
          min={1}
          max={limit}
          value={quantity}
          disabled={!selected}
          onChange={(event) => setQuantity(Math.max(1, Math.min(limit, Math.trunc(Number(event.target.value) || 1))))}
          className="w-20 rounded-sm border border-line-soft bg-surface-dark px-2 py-1 text-cream"
        />
        <span className="text-caption">máx. {limit}</span>
      </label>

      <div className="flex gap-2">
        <Button
          disabled={!selected || addToCart.isPending}
          onClick={() => selected && addToCart.mutate({ nftId, editionId: selected.id, quantity })}
        >
          {addToCart.isPending ? "Adicionando…" : "Comprar"}
        </Button>
        <Button
          variant="outline"
          aria-pressed={isFavorite}
          disabled={toggleFavorite.isPending}
          onClick={() => {
            if (!session) void navigate({ to: "/entrar", search: { redirect: href } })
            else toggleFavorite.mutate({ nftId, favorite: !isFavorite })
          }}
        >
          {isFavorite ? "Remover dos favoritos" : "Favoritar"}
        </Button>
      </div>
      <div role="status" aria-live="polite">
        {addToCart.isSuccess && (
          <p>
            Adicionado ao carrinho.{" "}
            <Link to="/carrinho" className="text-amber underline">
              Ver carrinho
            </Link>
          </p>
        )}
        {addToCart.isError && <p className="text-danger">{errorMessage(addToCart.error)}</p>}
        {toggleFavorite.isError && <p className="text-danger">Não foi possível atualizar os favoritos. {errorMessage(toggleFavorite.error)}</p>}
      </div>
    </ScreenPlaceholder>
  )
}
