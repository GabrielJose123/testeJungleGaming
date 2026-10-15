import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from "@/api/hooks/cart"
import type { CartItem, CartItemIssue } from "@/api/types"
import { ErrorState } from "@/components/feedback"
import { Breadcrumb, QuantityStepper, Shimmer } from "@/components/kit"
import { buttonStyles } from "@/components/kit-styles"
import { PageShell } from "@/components/layout/page-shell"
import { RelatedNfts } from "@/components/nft/related-nfts"
import { errorMessage } from "@/lib/error-message"
import { formatEth } from "@/lib/money"
import { cn } from "@/lib/utils"

function describeIssue(issue: CartItemIssue) {
  switch (issue.code) {
    case "PRICE_CHANGED":
      return `Preço alterado (antes ${formatEth(issue.previousUnitPriceEth)}).`
    case "OUT_OF_STOCK":
      return "Esgotado."
    case "QUANTITY_EXCEEDS_AVAILABLE":
      return `Só restam ${issue.available}.`
    case "EDITION_UNAVAILABLE":
      return "Edição indisponível."
  }
}

/** Figma: Desktop / Carrinho (11:1278) e Mobile / Carrinho (16:360). */
export function CartPage() {
  const cart = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  return (
    <PageShell nav="market" mobileTab="cart">
      <Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/" }, { label: "Carrinho" }]} />
      <h1 className="sr-only">Carrinho de NFTs</h1>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between">
        <section aria-label="Itens do carrinho">
          <div className="hidden grid-cols-[1fr_138px_136px_150px_40px] border-b border-line pb-3 text-body-lg font-bold text-cream lg:grid" aria-hidden>
            <span>NFTs</span>
            <span>Preço</span>
            <span>Edições</span>
            <span>Total</span>
          </div>
          {cart.isPending ? (
            <div role="status" aria-label="Carregando carrinho" className="mt-3 flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Shimmer key={index} className="h-[70px] w-full" />
              ))}
            </div>
          ) : cart.isError ? (
            <ErrorState error={cart.error} onRetry={() => void cart.refetch()} className="mt-6" />
          ) : cart.data.items.length === 0 ? (
            <div className="flex flex-col items-start gap-4 py-10">
              <p className="text-body-lg text-cream">Seu carrinho está vazio.</p>
              <Link to="/" className={cn(buttonStyles.primary, "h-10")}>
                Explorar NFTs
              </Link>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {cart.data.items.map((item) => (
                <CartRow
                  key={item.id}
                  item={item}
                  busy={updateItem.isPending || removeItem.isPending}
                  onQuantity={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
                  onRemove={() => removeItem.mutate(item.id)}
                />
              ))}
            </ul>
          )}
          {(updateItem.isError || removeItem.isError) && (
            <p role="alert" className="mt-3 text-body text-danger">
              {errorMessage(updateItem.error ?? removeItem.error)}
            </p>
          )}
        </section>

        {cart.data && cart.data.items.length > 0 && <CartSummary cart={cart.data} />}
      </div>
      <RelatedNfts title="Colecionadores também viram" className="mt-24" />
    </PageShell>
  )
}

function CartRow({ item, busy, onQuantity, onRemove }: { item: CartItem; busy: boolean; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  return (
    <li className="relative grid grid-cols-[70px_1fr_auto] items-center gap-x-4 gap-y-2 bg-surface-card pr-3 lg:grid-cols-[70px_1fr_138px_136px_150px_40px] lg:gap-y-0 lg:pr-0">
      <img src={item.image} alt="" width={70} height={70} className="row-span-2 size-[70px] object-cover lg:row-span-1" />
      <div className="flex min-w-0 flex-col gap-1 py-2">
        <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="truncate text-body-lg font-bold text-cream hover:text-amber">
          {item.name}
        </Link>
        <span className="text-body text-brand-muted">Edição {item.editionLabel}</span>
        {item.issues.map((issue) => (
          <span key={issue.code} role="note" className="text-caption text-amber">
            {describeIssue(issue)}
          </span>
        ))}
      </div>
      <span className="text-body-lg font-bold text-sand lg:order-none">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(item.unitPriceEth)}
      </span>
      <div className="col-start-2 lg:col-start-auto">
        <QuantityStepper size="sm" value={item.quantity} max={Math.min(item.available, item.maxPerOrder)} onChange={onQuantity} disabled={busy} label={item.name} />
      </div>
      <span className="text-right text-body-lg font-bold text-amber lg:text-left">
        <span className="sr-only">Total do item: </span>
        {formatEth(item.lineTotalEth)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        aria-label={`Remover ${item.name} do carrinho`}
        className="absolute top-2 right-2 rounded-xs p-1 text-sand hover:text-danger disabled:opacity-50 lg:static lg:mt-0"
      >
        <TrashIcon />
      </button>
    </li>
  )
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  )
}

function CartSummary({ cart }: { cart: NonNullable<ReturnType<typeof useCart>["data"]> }) {
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [coupon, setCoupon] = useState("")
  const { summary } = cart
  const blocked = cart.items.some((item) => item.issues.some((issue) => issue.code !== "PRICE_CHANGED"))

  return (
    <aside aria-labelledby="summary-title" className="flex flex-col gap-6">
      <h2 id="summary-title" className="border-b border-line pb-3 text-title font-bold text-cream">
        Resumo da carteira
      </h2>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          applyCoupon.mutate(coupon, { onSuccess: () => setCoupon("") })
        }}
      >
        <label htmlFor="coupon" className="text-body font-bold text-cream">
          Código promocional
        </label>
        <div className="flex">
          <input
            id="coupon"
            value={coupon}
            onChange={(event) => setCoupon(event.target.value)}
            placeholder="Digite o código promocional..."
            aria-describedby="coupon-feedback"
            aria-invalid={applyCoupon.isError}
            className="h-10 min-w-0 flex-1 rounded-l-xs border border-brand bg-transparent px-2 text-caption text-cream placeholder:text-brand-muted focus-visible:outline-none"
          />
          <button type="submit" disabled={!coupon.trim() || applyCoupon.isPending} className={cn(buttonStyles.primary, "h-10 rounded-l-none")}>
            Aplicar
          </button>
        </div>
        <div id="coupon-feedback" role="status" aria-live="polite" className="text-caption">
          {applyCoupon.isError && <p className="text-danger">{errorMessage(applyCoupon.error)}</p>}
          {cart.coupon && (
            <p className="text-sand">
              Cupom <strong className="text-cream">{cart.coupon.code}</strong> aplicado ({cart.coupon.description}).{" "}
              <button type="button" className="text-amber underline" onClick={() => removeCoupon.mutate()}>
                Remover
              </button>
            </p>
          )}
        </div>
      </form>

      <dl className="grid grid-cols-[1fr_auto] gap-y-4 text-body text-cream">
        <dt>Subtotal</dt>
        <dd className="text-right text-body-lg">{formatEth(summary.subtotalEth)}</dd>
        <dt>Desconto do lançamento</dt>
        <dd className="text-right">(-) {formatEth(summary.discountEth)}</dd>
        <dt>Taxa de rede</dt>
        <dd className="text-right text-body-lg">
          {formatEth(summary.networkFeeEth)}
          <span className="block pt-2 text-caption text-amber">Taxa estimada</span>
        </dd>
        <dt className="pt-2 font-bold">Total</dt>
        <dd className="pt-2 text-right text-title font-bold text-amber">{formatEth(summary.totalEth)}</dd>
      </dl>

      {blocked ? (
        <p role="alert" className="text-body text-amber">
          Ajuste os itens indisponíveis para continuar.
        </p>
      ) : (
        <Link to="/pagamento" className={cn(buttonStyles.primary, "h-10 w-full")}>
          Conectar e finalizar
        </Link>
      )}
      <Link to="/" className="text-center text-body text-amber hover:underline">
        Continuar explorando
      </Link>
    </aside>
  )
}
