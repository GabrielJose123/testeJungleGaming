import { describe, expect, it } from "vitest"

import type { CouponRecord } from "../db/schema"
import { checkCoupon, computeSummary, NETWORK_FEES } from "./pricing"

describe("computeSummary (cotação)", () => {
  const lines = [
    { unitPriceEth: "1.19", quantity: 2 },
    { unitPriceEth: "0.39", quantity: 1 },
  ]

  it("soma subtotal, taxa da rede e total sem cupom", () => {
    expect(computeSummary(lines, null, "ethereum")).toEqual({
      subtotalEth: "2.77",
      discountEth: "0",
      networkFeeEth: "0.0021",
      totalEth: "2.7721",
    })
  })

  it("aplica a taxa da rede de pagamento escolhida", () => {
    expect(computeSummary(lines, null, "polygon").networkFeeEth).toBe(NETWORK_FEES.polygon)
    expect(computeSummary(lines, null, "solana").totalEth).toBe("2.7702")
  })

  it("desconto percentual com arredondamento a 6 casas (meio para cima)", () => {
    const summary = computeSummary([{ unitPriceEth: "0.333335", quantity: 1 }], { kind: "percent", value: "10" }, "ethereum")
    // 10% de 0.333335 = 0.0333335 → exatamente no meio → 0.033334
    expect(summary.discountEth).toBe("0.033334")
    // 0.333335 − 0.033334 + 0.0021
    expect(summary.totalEth).toBe("0.302101")
    const below = computeSummary([{ unitPriceEth: "0.3333345", quantity: 1 }], { kind: "percent", value: "10" }, "ethereum")
    expect(below.discountEth).toBe("0.033333")
  })

  it("desconto fixo nunca passa do subtotal", () => {
    const small = computeSummary([{ unitPriceEth: "0.02", quantity: 1 }], { kind: "fixed", value: "0.05" }, "ethereum")
    expect(small.discountEth).toBe("0.02")
    expect(small.totalEth).toBe("0.0021")
  })

  it("mantém precisão de 18 casas em quantidades grandes", () => {
    const summary = computeSummary([{ unitPriceEth: "0.000000000000000001", quantity: 3 }], null, "solana")
    expect(summary.subtotalEth).toBe("0.000000000000000003")
    expect(summary.totalEth).toBe("0.000200000000000003")
  })

  it("carrinho vazio não paga taxa", () => {
    expect(computeSummary([], { kind: "percent", value: "10" }, "ethereum")).toEqual({
      subtotalEth: "0",
      discountEth: "0",
      networkFeeEth: "0",
      totalEth: "0",
    })
  })

  it("rejeita quantidade fracionária", () => {
    expect(() => computeSummary([{ unitPriceEth: "1", quantity: 1.5 }], null, "ethereum")).toThrow()
  })
})

describe("checkCoupon", () => {
  const coupon: CouponRecord = { code: "X", description: "", kind: "percent", value: "10", expiresAt: "2026-01-01T00:00:00Z" }

  it("classifica válido, expirado e inexistente", () => {
    expect(checkCoupon(coupon, new Date("2025-12-31T23:59:59Z"))).toBe("valid")
    expect(checkCoupon(coupon, new Date("2026-01-01T00:00:01Z"))).toBe("expired")
    expect(checkCoupon(undefined, new Date())).toBe("invalid")
  })
})
