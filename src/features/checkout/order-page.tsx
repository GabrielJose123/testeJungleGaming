import { getRouteApi, Link } from "@tanstack/react-router"

import { isApiError } from "@/api/errors"
import { useOrder } from "@/api/hooks/checkout"
import { ErrorState, LoadingState } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { formatEth } from "@/lib/money"

const route = getRouteApi("/_auth/pedidos/$orderId")

/**
 * Acompanhamento e recibo provisórios. A confirmação só aparece para `confirmed` vindo da API
 * (resposta REST ou evento order.updated). O recibo exibe o snapshot do pedido.
 */
export function OrderPage() {
  const { orderId } = route.useParams()
  const order = useOrder(orderId)

  if (order.isPending) return <ScreenPlaceholder title="Pedido"><LoadingState /></ScreenPlaceholder>
  if (order.isError) {
    const notFound = isApiError(order.error, "ORDER_NOT_FOUND") || isApiError(order.error, "FORBIDDEN")
    return (
      <ScreenPlaceholder title={notFound ? "Pedido não encontrado" : "Pedido"}>
        {notFound ? <p>Este pedido não existe ou pertence a outra conta.</p> : <ErrorState error={order.error} onRetry={() => void order.refetch()} />}
      </ScreenPlaceholder>
    )
  }

  const data = order.data
  if (data.status === "pending") {
    return (
      <ScreenPlaceholder title="Processando pagamento">
        <p role="status" aria-live="polite">
          Pedido {data.number} aguardando confirmação da carteira. Você pode recarregar a página: o acompanhamento continua.
        </p>
      </ScreenPlaceholder>
    )
  }

  if (data.status === "rejected") {
    return (
      <ScreenPlaceholder title="Pagamento recusado">
        <p role="alert">{data.failureReason ?? "O pagamento não foi concluído."}</p>
        <p>Seus itens continuam no carrinho.</p>
        <Link to="/carrinho" className="text-amber underline">
          Voltar ao carrinho
        </Link>
      </ScreenPlaceholder>
    )
  }

  return (
    <ScreenPlaceholder title="Pedido confirmado">
      <p role="status">Pedido {data.number} confirmado.</p>
      {data.transaction && (
        <p className="break-all">
          Transação:{" "}
          <a href={data.transaction.explorerUrl} target="_blank" rel="noreferrer" className="text-amber underline">
            {data.transaction.hash}
          </a>{" "}
          (simulada)
        </p>
      )}
      <ul>
        {data.items.map((item) => (
          <li key={`${item.nftId}-${item.editionId}`}>
            {item.name} ({item.editionLabel}) — {formatEth(item.unitPriceEth)} × {item.quantity} = {formatEth(item.lineTotalEth)}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-1">
        <dt>Subtotal</dt>
        <dd>{formatEth(data.summary.subtotalEth)}</dd>
        <dt>Desconto</dt>
        <dd>− {formatEth(data.summary.discountEth)}</dd>
        <dt>Taxa de rede</dt>
        <dd>{formatEth(data.summary.networkFeeEth)}</dd>
        <dt className="font-bold text-cream">Total</dt>
        <dd className="font-bold text-cream">{formatEth(data.summary.totalEth)}</dd>
      </dl>
    </ScreenPlaceholder>
  )
}
