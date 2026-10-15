import { createFileRoute } from "@tanstack/react-router"

import { OrderPage } from "@/features/checkout/order-page"

export const Route = createFileRoute("/_auth/pedidos/$orderId")({
  component: OrderPage,
})
