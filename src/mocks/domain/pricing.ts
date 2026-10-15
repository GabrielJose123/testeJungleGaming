import Decimal from "decimal.js"

import type { AppliedCoupon, EthAmount, Network, PriceSummary } from "@/api/types"
import { eth, multiplyEth, toEthAmount, type EthDecimal } from "@/lib/money"

import type { CouponRecord } from "../db/schema"

/** Taxa de rede por rede de pagamento (simulada, em ETH). */
export const NETWORK_FEES: Record<Network, EthAmount> = {
  ethereum: "0.0021",
  polygon: "0.0004",
  solana: "0.0002",
}

export const DEFAULT_NETWORK: Network = "ethereum"

/** Casas decimais do desconto percentual. */
const DISCOUNT_DECIMALS = 6

export interface PricedLine {
  unitPriceEth: EthAmount
  quantity: number
}

export function lineTotal(line: PricedLine): EthAmount {
  return multiplyEth(line.unitPriceEth, line.quantity)
}

/**
 * Regra de cotação (docs/design.md §2):
 * subtotal = Σ preço × quantidade; desconto percentual arredondado a 6 casas (meio para cima)
 * ou fixo limitado ao subtotal; taxa por rede; total = subtotal − desconto + taxa.
 * Carrinho vazio não paga taxa.
 */
export function computeSummary(lines: PricedLine[], coupon: Pick<AppliedCoupon, "kind" | "value"> | null, network: Network): PriceSummary {
  const subtotal = lines.reduce<EthDecimal>((sum, line) => sum.plus(lineTotal(line)), eth(0))

  let discount = eth(0)
  if (coupon && subtotal.greaterThan(0)) {
    discount =
      coupon.kind === "percent"
        ? subtotal.times(coupon.value).dividedBy(100).toDecimalPlaces(DISCOUNT_DECIMALS, Decimal.ROUND_HALF_UP)
        : eth(coupon.value).lessThan(subtotal)
          ? eth(coupon.value)
          : subtotal
  }

  const fee = lines.length > 0 ? eth(NETWORK_FEES[network]) : eth(0)
  const total = subtotal.minus(discount).plus(fee)

  return {
    subtotalEth: toEthAmount(subtotal),
    discountEth: toEthAmount(discount),
    networkFeeEth: toEthAmount(fee),
    totalEth: toEthAmount(total),
  }
}

export type CouponValidity = "valid" | "expired" | "invalid"

export function checkCoupon(coupon: CouponRecord | undefined, now: Date): CouponValidity {
  if (!coupon) return "invalid"
  return new Date(coupon.expiresAt).getTime() < now.getTime() ? "expired" : "valid"
}

export function toAppliedCoupon(coupon: CouponRecord): AppliedCoupon {
  return { code: coupon.code, description: coupon.description, kind: coupon.kind, value: coupon.value }
}
