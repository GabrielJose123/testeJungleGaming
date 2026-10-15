import { getRouteApi, Link } from "@tanstack/react-router"

import { isApiError } from "@/api/errors"
import { useOrder } from "@/api/hooks/checkout"
import type { Order } from "@/api/types"
import { ErrorState } from "@/components/feedback"
import { Shimmer } from "@/components/kit"
import { buttonStyles } from "@/components/kit-styles"
import { PageShell } from "@/components/layout/page-shell"
import { formatEth } from "@/lib/money"
import { cn } from "@/lib/utils"
import { shortAddress } from "@/lib/wallet-format"

const route = getRouteApi("/_auth/pedidos/$orderId")

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

/**
 * Figma: Desktop / Confirmação de Pedido (11:4385) — painel "Seus NFTs agora estão na sua carteira",
 * metadados da transação e tabela de itens. A confirmação só aparece para `confirmed` vindo da API
 * (REST ou evento order.updated); o recibo exibe o snapshot do pedido.
 */
export function OrderPage() {
  const { orderId } = route.useParams()
  const order = useOrder(orderId)

  let content: React.ReactNode
  if (order.isPending) {
    content = (
      <div role="status" aria-label="Carregando pedido" className="flex flex-col gap-4">
        <Shimmer className="h-10 w-2/3" />
        <Shimmer className="h-24" />
        <Shimmer className="h-40" />
      </div>
    )
  } else if (order.isError) {
    const notFound = isApiError(order.error, "ORDER_NOT_FOUND") || isApiError(order.error, "FORBIDDEN")
    content = notFound ? (
      <Panel title="Pedido não encontrado">
        <p className="text-body text-sand">Este pedido não existe ou pertence a outra conta.</p>
      </Panel>
    ) : (
      <ErrorState error={order.error} onRetry={() => void order.refetch()} />
    )
  } else if (order.data.status === "pending") {
    content = (
      <Panel title="Processando pagamento">
        <p role="status" aria-live="polite" className="flex items-center gap-3 text-body text-sand">
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Pedido {order.data.number} aguardando confirmação da carteira. Você pode recarregar a página: o acompanhamento continua.
        </p>
      </Panel>
    )
  } else if (order.data.status === "rejected") {
    content = (
      <Panel title="Pagamento recusado">
        <p role="alert" className="text-body text-danger">
          {order.data.failureReason ?? "O pagamento não foi concluído."}
        </p>
        <p className="text-body text-sand">Seus itens continuam no carrinho.</p>
        <Link to="/carrinho" className={cn(buttonStyles.primary, "h-10 self-start")}>
          Voltar ao carrinho
        </Link>
      </Panel>
    )
  } else {
    content = <Receipt order={order.data} />
  }

  return (
    <PageShell nav="market" mobileTab={null}>
      {content}
    </PageShell>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="order-title" className="mx-auto flex w-full max-w-[760px] flex-col gap-5 border-b-[10px] border-brand bg-surface-card px-6 py-10 lg:px-14">
      <h1 id="order-title" className="text-title-lg leading-8 font-bold text-cream">
        {title}
      </h1>
      {children}
    </section>
  )
}

function Receipt({ order }: { order: Order }) {
  const meta = [
    { label: "ID da transação", value: order.transaction ? shortAddress(order.transaction.hash) : order.number },
    { label: "Data", value: dateFormat.format(new Date(order.updatedAt)) },
    { label: "Total", value: formatEth(order.summary.totalEth) },
    { label: "Carteira", value: order.wallet.label },
  ]
  return (
    <Panel title="Seus NFTs agora estão na sua carteira">
      <p role="status" className="text-body text-sand">
        Pedido {order.number} confirmado para {order.collector.fullName}.
      </p>
      <dl className="grid grid-cols-2 gap-4 border-y border-dashed border-line-soft py-5 lg:grid-cols-4 lg:divide-x lg:divide-line-soft">
        {meta.map((entry) => (
          <div key={entry.label} className="flex flex-col gap-1 lg:px-4 lg:first:pl-0">
            <dt className="text-caption text-sand">{entry.label}</dt>
            <dd className="text-body font-bold break-all text-cream">{entry.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="text-body-lg font-bold text-cream">Detalhes da transação</h2>
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-line text-left text-cream">
            <th scope="col" className="pb-2 font-bold">NFTs</th>
            <th scope="col" className="pb-2 font-bold">Edições</th>
            <th scope="col" className="pb-2 text-right font-bold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={`${item.nftId}-${item.editionId}`} className="border-b border-line/60">
              <td className="py-3">
                <span className="flex items-center gap-3">
                  <img src={item.image} alt="" width={48} height={48} className="size-12 object-cover" />
                  <span className="text-cream">{item.name}</span>
                </span>
              </td>
              <td className="py-3 text-sand">
                {item.editionLabel} (x {item.quantity})
              </td>
              <td className="py-3 text-right font-bold text-amber">{formatEth(item.lineTotalEth)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto grid w-full max-w-[300px] grid-cols-[1fr_auto] gap-y-2 text-body text-cream">
        <dt>Subtotal</dt>
        <dd className="text-right">{formatEth(order.summary.subtotalEth)}</dd>
        <dt>Desconto</dt>
        <dd className="text-right">(-) {formatEth(order.summary.discountEth)}</dd>
        <dt>Taxa de rede</dt>
        <dd className="text-right">{formatEth(order.summary.networkFeeEth)}</dd>
        <dt className="font-bold">Total</dt>
        <dd className="text-right font-bold text-amber">{formatEth(order.summary.totalEth)}</dd>
      </dl>
      {order.transaction && (
        <p className="text-caption break-all text-sand">
          Transação (simulada):{" "}
          <a href={order.transaction.explorerUrl} target="_blank" rel="noreferrer" className="text-amber underline">
            {order.transaction.hash}
          </a>
        </p>
      )}
      <Link to="/" className={cn(buttonStyles.primary, "h-10 self-center")}>
        Continuar explorando
      </Link>
    </Panel>
  )
}
