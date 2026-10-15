import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { isApiError } from "@/api/errors"
import { useConnectWallet, useDisconnectWallet, useWallets } from "@/api/hooks/account"
import { useCart } from "@/api/hooks/cart"
import { staleQuoteFrom, useCreateOrder, useCreateQuote } from "@/api/hooks/checkout"
import { NETWORKS, type CollectorDetails, type Network, type Quote } from "@/api/types"
import { ErrorState, FieldError, LoadingState } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/error-message"
import { formatEth } from "@/lib/money"
import { changedSince, useRealtimeState } from "@/realtime/realtime-store"
import { useSession } from "@/session/use-session"

import { clearCheckoutDraft, emptyCollector, readCheckoutDraft, saveCheckoutDraft } from "./checkout-draft"

const NETWORK_LABELS: Record<Network, string> = { ethereum: "Ethereum", polygon: "Polygon", solana: "Solana" }

const collectorFields: Array<{ name: keyof CollectorDetails; label: string; type: string; autoComplete: string }> = [
  { name: "fullName", label: "Nome completo", type: "text", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "phone", label: "Telefone", type: "tel", autoComplete: "tel" },
  { name: "country", label: "País", type: "text", autoComplete: "country-name" },
]

/** Checkout provisório: dados → carteira e rede → revisão (cotação) → confirmação idempotente. */
export function CheckoutPage() {
  const session = useSession()
  const navigate = useNavigate()
  const cart = useCart()
  const wallets = useWallets()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const createQuote = useCreateQuote()
  const createOrder = useCreateOrder()
  const { nftChanges } = useRealtimeState()

  const draft = readCheckoutDraft()
  const [collector, setCollector] = useState<CollectorDetails>(
    draft.collector ?? { ...emptyCollector, fullName: session?.user.name ?? "", email: session?.user.email ?? "" },
  )
  const [walletId, setWalletId] = useState(draft.walletId ?? "")
  const [network, setNetwork] = useState<Network>(draft.network ?? "ethereum")
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteNotice, setQuoteNotice] = useState<string | null>(null)

  useEffect(() => saveCheckoutDraft({ collector, walletId, network }), [collector, walletId, network])


  const changedItems = quote ? changedSince(quote.items.map((item) => item.nftId), quote.createdAt, nftChanges) : []
  const quoteIsStale = changedItems.length > 0
  const wallet = wallets.data?.items.find((entry) => entry.id === walletId)
  const fieldErrors = isApiError(createOrder.error) ? createOrder.error.fieldErrors : {}

  if (cart.isPending || wallets.isPending) return <ScreenPlaceholder title="Pagamento"><LoadingState /></ScreenPlaceholder>
  if (cart.isError || wallets.isError) {
    return (
      <ScreenPlaceholder title="Pagamento">
        <ErrorState error={cart.error ?? wallets.error} onRetry={() => void Promise.all([cart.refetch(), wallets.refetch()])} />
      </ScreenPlaceholder>
    )
  }
  if (cart.data.items.length === 0 && !createOrder.isPending) {
    return (
      <ScreenPlaceholder title="Pagamento">
        <p>Seu carrinho está vazio.</p>
        <Link to="/" className="text-amber underline">
          Explorar NFTs
        </Link>
      </ScreenPlaceholder>
    )
  }

  const review = () =>
    createQuote.mutate(network, {
      onSuccess: (next) => {
        setQuote(next)
        setQuoteNotice(null)
      },
    })

  const confirm = () => {
    if (!quote || !wallet) return
    createOrder.mutate(
      { quoteId: quote.id, walletId: wallet.id, network, collector },
      {
        onSuccess: ({ order }) => {
          clearCheckoutDraft()
          void navigate({ to: "/pedidos/$orderId", params: { orderId: order.id } })
        },
        onError: (error) => {
          const fresh = staleQuoteFrom(error)
          if (fresh) {
            setQuote(fresh)
            setQuoteNotice("Os valores mudaram desde a revisão. Confira o novo total e confirme novamente.")
          }
        },
      },
    )
  }

  return (
    <ScreenPlaceholder title="Pagamento">
      <form noValidate className="flex flex-col gap-2" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-bold text-cream">Dados do colecionador</legend>
          {collectorFields.map((field) => {
            const errorKey = `collector.${field.name}`
            return (
              <label key={field.name} className="flex flex-col gap-1">
                {field.label}
                <input
                  type={field.type}
                  autoComplete={field.autoComplete}
                  value={collector[field.name]}
                  onChange={(event) => setCollector((current) => ({ ...current, [field.name]: event.target.value }))}
                  aria-invalid={Boolean(fieldErrors[errorKey])}
                  aria-describedby={`${errorKey}-error`}
                  className="rounded-sm border border-line-soft bg-surface-dark px-2 py-1 text-cream"
                />
                <FieldError id={`${errorKey}-error`} message={fieldErrors[errorKey]} />
              </label>
            )
          })}
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className="font-bold text-cream">Carteira</legend>
          {wallets.data.items.length === 0 && (
            <p>
              Nenhuma carteira cadastrada.{" "}
              <Link to="/carteiras" className="text-amber underline">
                Cadastrar carteira
              </Link>
            </p>
          )}
          {wallets.data.items.map((entry) => (
            <label key={entry.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="wallet"
                checked={walletId === entry.id}
                onChange={() => {
                  // Trocar de carteira invalida a revisão atual.
                  setWalletId(entry.id)
                  setQuote(null)
                }}
              />
              {entry.label} ({entry.role === "primary" ? "principal" : "secundária"}) — {entry.connection === "connected" ? "conectada" : "desconectada"}
            </label>
          ))}
          {wallet && (
            <div className="flex gap-2">
              {wallet.connection === "connected" ? (
                <Button size="sm" variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate(wallet.id)}>
                  Desconectar
                </Button>
              ) : (
                <Button size="sm" disabled={connect.isPending} onClick={() => connect.mutate(wallet.id)}>
                  {connect.isPending ? "Conectando…" : "Conectar carteira"}
                </Button>
              )}
            </div>
          )}
          {connect.isError && (
            <p role="alert" className="text-danger">
              {errorMessage(connect.error)}
            </p>
          )}
        </fieldset>

        <label className="flex flex-col gap-1">
          Rede
          <select
            value={network}
            onChange={(event) => {
              // A taxa depende da rede: a revisão precisa ser refeita.
              setNetwork(event.target.value as Network)
              setQuote(null)
            }}
            className="rounded-sm border border-line-soft bg-surface-dark px-2 py-1 text-cream"
          >
            {NETWORKS.map((option) => (
              <option key={option} value={option}>
                {NETWORK_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <Button type="button" variant="outline" disabled={createQuote.isPending} onClick={review}>
          {createQuote.isPending ? "Calculando…" : quote ? "Atualizar revisão" : "Revisar pedido"}
        </Button>
        {createQuote.isError && (
          <p role="alert" className="text-danger">
            {errorMessage(createQuote.error)}
          </p>
        )}
      </form>

      {quote && (
        <section aria-labelledby="review-title" className="flex flex-col gap-2">
          <h2 id="review-title" className="font-bold text-cream">
            Revisão
          </h2>
          <ul>
            {quote.items.map((item) => (
              <li key={`${item.nftId}-${item.editionId}`}>
                {item.name} ({item.editionLabel}) — {formatEth(item.unitPriceEth)} × {item.quantity}
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-2 gap-1">
            <dt>Subtotal</dt>
            <dd>{formatEth(quote.summary.subtotalEth)}</dd>
            <dt>Desconto</dt>
            <dd>− {formatEth(quote.summary.discountEth)}</dd>
            <dt>Taxa de rede ({NETWORK_LABELS[quote.network]})</dt>
            <dd>{formatEth(quote.summary.networkFeeEth)}</dd>
            <dt className="font-bold text-cream">Total</dt>
            <dd className="font-bold text-cream">{formatEth(quote.summary.totalEth)}</dd>
          </dl>
          <div role="status" aria-live="polite">
            {quoteNotice && <p className="text-amber">{quoteNotice}</p>}
            {quoteIsStale && <p className="text-amber">O preço ou a disponibilidade mudou. Atualize a revisão antes de confirmar.</p>}
          </div>
          <Button
            type="button"
            disabled={!wallet || wallet.connection !== "connected" || quoteIsStale || createOrder.isPending}
            onClick={confirm}
          >
            {createOrder.isPending ? "Enviando pedido…" : "Confirmar pedido"}
          </Button>
          {!wallet && <p>Escolha uma carteira para confirmar.</p>}
          {wallet && wallet.connection !== "connected" && <p>Conecte a carteira para confirmar.</p>}
          {createOrder.isError && !staleQuoteFrom(createOrder.error) && (
            <p role="alert" className="text-danger">
              {errorMessage(createOrder.error)}
            </p>
          )}
        </section>
      )}
    </ScreenPlaceholder>
  )
}
