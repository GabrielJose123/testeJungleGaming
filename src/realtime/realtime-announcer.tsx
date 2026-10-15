import { formatEth } from "@/lib/money"

import { useRealtimeState, type RealtimeNotice } from "./realtime-store"

const ORDER_STATUS_TEXT = {
  pending: "Pedido pendente.",
  confirmed: "Pedido confirmado.",
  rejected: "Pedido recusado.",
} as const

function describe(notice: RealtimeNotice) {
  if (notice.kind === "order-changed") return ORDER_STATUS_TEXT[notice.status]
  if (!notice.inCart) return null
  const name = notice.name ?? "Um item"
  if (notice.available === 0) return `${name} esgotou. O resumo do carrinho foi atualizado.`
  return `${name} agora custa ${formatEth(notice.priceEth)}. O resumo do carrinho foi atualizado.`
}

export function RealtimeAnnouncer() {
  const { notices } = useRealtimeState()
  const last = [...notices].reverse().find((notice) => describe(notice))
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {last ? describe(last) : ""}
    </div>
  )
}
