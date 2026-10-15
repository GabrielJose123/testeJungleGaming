import Decimal from "decimal.js"

import type { EthAmount } from "@/api/types"

export const Eth = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP })
export type EthDecimal = InstanceType<typeof Eth>

export const ETH_DECIMALS = 18

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === "string" && DECIMAL_PATTERN.test(value)
}

export function eth(value: EthAmount | EthDecimal | number): EthDecimal {
  return new Eth(value)
}

export function toEthAmount(value: EthDecimal): EthAmount {
  const fixed = value.toDecimalPlaces(ETH_DECIMALS).toFixed()
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed
}

export function addEth(...values: EthAmount[]): EthAmount {
  return toEthAmount(values.reduce<EthDecimal>((sum, value) => sum.plus(value), new Eth(0)))
}

export function multiplyEth(value: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity)) throw new Error("Quantidade deve ser inteira")
  return toEthAmount(new Eth(value).times(quantity))
}

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  return new Eth(a).comparedTo(b) as -1 | 0 | 1
}

interface FormatOptions {
  minDecimals?: number
  maxDecimals?: number
  locale?: "figma" | "pt-BR"
}

export function formatEth(value: EthAmount, { minDecimals = 2, maxDecimals = 6, locale = "figma" }: FormatOptions = {}) {
  const rounded = new Eth(value).toDecimalPlaces(maxDecimals)
  const decimals = Math.max(minDecimals, Math.min(maxDecimals, rounded.decimalPlaces()))
  const text = rounded.toFixed(decimals)
  return `${locale === "pt-BR" ? text.replace(".", ",") : text} ETH`
}
