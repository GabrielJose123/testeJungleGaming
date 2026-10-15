import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from "@/api/hooks/cart"
import type { CartItemIssue } from "@/api/types"
import { ErrorState, LoadingState } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/error-message"
import { formatEth } from "@/lib/money"

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

/** Carrinho provisório: quantidades, remoção, cupom e resumo vindos da API. */
export function CartPage() {
  const cart = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [coupon, setCoupon] = useState("")

  if (cart.isPending) return <ScreenPlaceholder title="Carrinho de NFTs"><LoadingState /></ScreenPlaceholder>
  if (cart.isError) {
    return (
      <ScreenPlaceholder title="Carrinho de NFTs">
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
      </ScreenPlaceholder>
    )
  }

  const { items, summary } = cart.data
  const blocked = items.some((item) => item.issues.some((issue) => issue.code !== "PRICE_CHANGED"))

  return (
    <ScreenPlaceholder title="Carrinho de NFTs">
      {items.length === 0 ? (
        <p>
          Seu carrinho está vazio.{" "}
          <Link to="/" className="text-amber underline">
            Explorar NFTs
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 border-b border-line pb-3">
              <span className="text-cream">
                {item.name} — edição {item.editionLabel}
              </span>
              <span>
                {formatEth(item.unitPriceEth)} × {item.quantity} = {formatEth(item.lineTotalEth)}
              </span>
              {item.issues.map((issue) => (
                <span key={issue.code} role="note" className="text-amber">
                  {describeIssue(issue)}
                </span>
              ))}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Diminuir quantidade de ${item.name}`}
                  disabled={item.quantity <= 1 || updateItem.isPending}
                  onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                >
                  −
                </Button>
                <span aria-label="Quantidade">{item.quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Aumentar quantidade de ${item.name}`}
                  disabled={item.quantity >= Math.min(item.available, item.maxPerOrder) || updateItem.isPending}
                  onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                >
                  +
                </Button>
                <Button size="sm" variant="ghost" disabled={removeItem.isPending} onClick={() => removeItem.mutate(item.id)}>
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          applyCoupon.mutate(coupon, { onSuccess: () => setCoupon("") })
        }}
      >
        <label className="flex flex-col gap-1">
          Cupom
          <input
            value={coupon}
            onChange={(event) => setCoupon(event.target.value)}
            aria-describedby="coupon-feedback"
            className="rounded-sm border border-line-soft bg-surface-dark px-2 py-1 text-cream"
          />
        </label>
        <Button type="submit" disabled={!coupon.trim() || applyCoupon.isPending}>
          Aplicar
        </Button>
      </form>
      <div id="coupon-feedback" role="status" aria-live="polite">
        {applyCoupon.isError && <p className="text-danger">{errorMessage(applyCoupon.error)}</p>}
        {cart.data.coupon && (
          <p>
            Cupom {cart.data.coupon.code} aplicado ({cart.data.coupon.description}).{" "}
            <button type="button" className="text-amber underline" onClick={() => removeCoupon.mutate()}>
              Remover cupom
            </button>
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-1">
        <dt>Subtotal</dt>
        <dd>{formatEth(summary.subtotalEth)}</dd>
        <dt>Desconto</dt>
        <dd>− {formatEth(summary.discountEth)}</dd>
        <dt>Taxa de rede</dt>
        <dd>{formatEth(summary.networkFeeEth)}</dd>
        <dt className="font-bold text-cream">Total</dt>
        <dd className="font-bold text-cream">{formatEth(summary.totalEth)}</dd>
      </dl>
      {(updateItem.isError || removeItem.isError) && (
        <p role="alert" className="text-danger">
          {errorMessage(updateItem.error ?? removeItem.error)}
        </p>
      )}
      {items.length > 0 &&
        (blocked ? (
          <p className="text-amber">Ajuste os itens indisponíveis para continuar.</p>
        ) : (
          <Link to="/pagamento" className="text-amber underline">
            Ir para pagamento
          </Link>
        ))}
    </ScreenPlaceholder>
  )
}
