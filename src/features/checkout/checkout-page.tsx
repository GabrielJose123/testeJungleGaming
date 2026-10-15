import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { isApiError } from "@/api/errors"
import { useConnectWallet, useWallets } from "@/api/hooks/account"
import { useCart } from "@/api/hooks/cart"
import { staleQuoteFrom, useCreateOrder, useCreateQuote } from "@/api/hooks/checkout"
import { NETWORKS, type CollectorDetails, type Network, type Quote } from "@/api/types"
import { ErrorState } from "@/components/feedback"
import { Breadcrumb, OutlineButton, PrimaryButton, Shimmer, TextField } from "@/components/kit"
import { buttonStyles } from "@/components/kit-styles"
import { PageShell } from "@/components/layout/page-shell"
import { errorMessage } from "@/lib/error-message"
import { formatEth } from "@/lib/money"
import { cn } from "@/lib/utils"
import { NETWORK_LABELS, shortAddress } from "@/lib/wallet-format"
import { changedSince, useRealtimeState } from "@/realtime/realtime-store"
import { useSession } from "@/session/use-session"

import { clearCheckoutDraft, emptyCollector, readCheckoutDraft, saveCheckoutDraft } from "./checkout-draft"

const collectorFields: Array<{ name: keyof CollectorDetails; label: string; type: string; autoComplete: string }> = [
  { name: "fullName", label: "Nome completo", type: "text", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "phone", label: "Telefone", type: "tel", autoComplete: "tel" },
  { name: "country", label: "País", type: "text", autoComplete: "country-name" },
]

const NETWORK_INITIAL: Record<Network, string> = { ethereum: "E", polygon: "P", solana: "S" }

const optionCard = (selected: boolean) =>
  cn(
    "flex w-full cursor-pointer items-center gap-4 rounded-3xl bg-surface-card px-4 py-4 text-left has-focus-visible:outline-2 has-focus-visible:outline-amber",
    selected && "ring-1 ring-brand",
  )

function Radio({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full border border-brand">
      {checked && <span className="size-2 rounded-full bg-brand" />}
    </span>
  )
}

/**
 * Figma: Desktop / Pagamento (11:2862) e Mobile / Pagamento com carteira (16:748).
 * Fluxo: dados → carteira e rede → revisão (cotação) → confirmação idempotente.
 */
export function CheckoutPage() {
  const session = useSession()
  const navigate = useNavigate()
  const router = useRouter()
  const cart = useCart()
  const wallets = useWallets()
  const connect = useConnectWallet()
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

  let body: React.ReactNode
  if (cart.isPending || wallets.isPending) {
    body = (
      <div role="status" aria-label="Carregando pagamento" className="flex flex-col gap-4">
        <Shimmer className="h-[92px]" />
        <Shimmer className="h-[92px]" />
        <Shimmer className="h-16" />
      </div>
    )
  } else if (cart.isError || wallets.isError) {
    body = <ErrorState error={cart.error ?? wallets.error} onRetry={() => void Promise.all([cart.refetch(), wallets.refetch()])} />
  } else if (cart.data.items.length === 0 && !createOrder.isPending) {
    body = (
      <div className="flex flex-col items-start gap-4 py-10">
        <p className="text-body-lg text-cream">Seu carrinho está vazio.</p>
        <Link to="/" className={cn(buttonStyles.primary, "h-10")}>
          Explorar NFTs
        </Link>
      </div>
    )
  } else {
    body = (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <form noValidate className="flex flex-col gap-8" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="grid gap-5 lg:grid-cols-2">
            <legend className="mb-4 text-body-lg font-bold text-cream">Dados do colecionador</legend>
            {collectorFields.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                required
                type={field.type}
                autoComplete={field.autoComplete}
                value={collector[field.name]}
                onChange={(event) => setCollector((current) => ({ ...current, [field.name]: event.target.value }))}
                error={fieldErrors[`collector.${field.name}`]}
              />
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <legend className="text-body-lg font-bold text-cream">Carteira conectada</legend>
              <Link to="/carteiras" className="text-body font-bold text-amber hover:underline">
                Trocar carteira
              </Link>
            </div>
            {wallets.data.items.length === 0 && (
              <p className="text-body text-sand">
                Nenhuma carteira cadastrada.{" "}
                <Link to="/carteiras" className="text-amber underline">
                  Cadastrar carteira
                </Link>
              </p>
            )}
            {wallets.data.items.map((entry) => (
              <label key={entry.id} className={optionCard(walletId === entry.id)}>
                <input
                  type="radio"
                  name="wallet"
                  className="sr-only"
                  checked={walletId === entry.id}
                  onChange={() => {
                    // Trocar de carteira invalida a revisão atual.
                    setWalletId(entry.id)
                    setQuote(null)
                  }}
                />
                <Radio checked={walletId === entry.id} />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="text-body-lg font-bold text-cream">{entry.label}</span>
                  <span className="text-body text-sand" title={entry.address}>
                    {shortAddress(entry.address)}
                  </span>
                  <span className="text-body text-sand">
                    Rede {NETWORK_LABELS[entry.network]} ·{" "}
                    <span className={entry.connection === "connected" ? "text-success" : "text-brand-muted"}>{entry.connection === "connected" ? "conectada" : "desconectada"}</span>
                  </span>
                </span>
              </label>
            ))}
            {wallet && wallet.connection !== "connected" && (
              <OutlineButton className="self-start" disabled={connect.isPending} onClick={() => connect.mutate(wallet.id)}>
                {connect.isPending ? "Conectando…" : "Conectar carteira"}
              </OutlineButton>
            )}
            {connect.isError && (
              <p role="alert" className="text-body text-danger">
                {errorMessage(connect.error)}
              </p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 text-body-lg font-bold text-cream">Carteira e rede</legend>
            {NETWORKS.map((option) => (
              <label key={option} className={optionCard(network === option)}>
                <input
                  type="radio"
                  name="network"
                  className="sr-only"
                  checked={network === option}
                  onChange={() => {
                    // A taxa depende da rede: a revisão precisa ser refeita.
                    setNetwork(option)
                    setQuote(null)
                  }}
                />
                <span aria-hidden className="flex size-10 items-center justify-center rounded-full border border-line-soft text-body font-bold text-amber">
                  {NETWORK_INITIAL[option]}
                </span>
                <span className="flex-1 text-body text-cream">{NETWORK_LABELS[option]}</span>
                <Radio checked={network === option} />
              </label>
            ))}
          </fieldset>

          <OutlineButton disabled={createQuote.isPending} onClick={review} className="self-start">
            {createQuote.isPending ? "Calculando…" : quote ? "Atualizar revisão" : "Revisar pedido"}
          </OutlineButton>
          {createQuote.isError && (
            <p role="alert" className="text-body text-danger">
              {errorMessage(createQuote.error)}
            </p>
          )}
        </form>

        <aside aria-labelledby="review-title" className="flex flex-col gap-5 lg:self-start">
          <h2 id="review-title" className="border-b border-line pb-3 text-title font-bold text-cream">
            Resumo do pedido
          </h2>
          {!quote ? (
            <p className="text-body leading-6 text-sand">Escolha a carteira e a rede e clique em “Revisar pedido” para ver o total com a taxa da rede.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {quote.items.map((item) => (
                  <li key={`${item.nftId}-${item.editionId}`} className="flex items-center gap-3 bg-surface-card pr-3">
                    <img src={item.image} alt="" width={56} height={56} className="size-14 object-cover" />
                    <span className="flex-1 text-body text-cream">
                      {item.name} <span className="text-sand">({item.editionLabel}) × {item.quantity}</span>
                    </span>
                    <span className="text-body font-bold text-amber">{formatEth(item.lineTotalEth)}</span>
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-body text-cream">
                <dt>Subtotal</dt>
                <dd className="text-right">{formatEth(quote.summary.subtotalEth)}</dd>
                <dt>Desconto</dt>
                <dd className="text-right">(-) {formatEth(quote.summary.discountEth)}</dd>
                <dt>Taxa de rede ({NETWORK_LABELS[quote.network]})</dt>
                <dd className="text-right">{formatEth(quote.summary.networkFeeEth)}</dd>
                <dt className="pt-2 text-body-lg font-bold">Total:</dt>
                <dd className="pt-2 text-right text-title-lg font-bold text-amber">{formatEth(quote.summary.totalEth)}</dd>
              </dl>
            </>
          )}
          <div role="status" aria-live="polite" className="text-body text-amber">
            {quoteNotice && <p>{quoteNotice}</p>}
            {quoteIsStale && <p>O preço ou a disponibilidade mudou. Atualize a revisão antes de confirmar.</p>}
            {quote && !wallet && <p>Escolha uma carteira para confirmar.</p>}
            {quote && wallet && wallet.connection !== "connected" && <p>Conecte a carteira para confirmar.</p>}
          </div>
          <PrimaryButton
            disabled={!quote || !wallet || wallet.connection !== "connected" || quoteIsStale || createOrder.isPending}
            onClick={confirm}
            className="h-14 rounded-full bg-gradient-to-r from-brand to-amber text-body-lg lg:h-11 lg:rounded-xs"
          >
            {createOrder.isPending ? "Enviando pedido…" : "Confirmar compra"}
          </PrimaryButton>
          {createOrder.isError && !staleQuoteFrom(createOrder.error) && (
            <p role="alert" className="text-body text-danger">
              {errorMessage(createOrder.error)}
            </p>
          )}
        </aside>
      </div>
    )
  }

  return (
    <PageShell nav="market" mobileTab={null}>
      <Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Carrinho", to: "/carrinho" }, { label: "Pagamento" }]} />
      <div className="mb-8 flex items-center gap-4">
        <button type="button" onClick={() => router.history.back()} aria-label="Voltar" className="flex size-9 items-center justify-center rounded-full border border-line-soft text-cream lg:hidden">
          ‹
        </button>
        <h1 className="text-title-lg font-bold text-cream lg:text-heading">Pagamento com carteira</h1>
      </div>
      {body}
    </PageShell>
  )
}
