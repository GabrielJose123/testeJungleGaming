import Decimal from "decimal.js"

import type { EthAmount } from "@/api/types"

/**
 * Aritmética e formatação de valores em ETH. Toda conta passa por decimal.js
 * (nunca `number`) para não perder precisão. Valores trafegam como strings decimais.
 */
export const Eth = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP })
export type EthDecimal = InstanceType<typeof Eth>

/** Maior precisão suportada (wei). */
export const ETH_DECIMALS = 18

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === "string" && DECIMAL_PATTERN.test(value)
}

export function eth(value: EthAmount | EthDecimal | number): EthDecimal {
  return new Eth(value)
}

/** Serializa para string decimal sem notação científica nem zeros à direita. */
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
  /** Casas decimais mínimas (padrão 2). */
  minDecimals?: number
  /** Casas decimais máximas (padrão 6). */
  maxDecimals?: number
  /** Separador decimal; o Figma usa ponto ("1.19 ETH"). */
  locale?: "figma" | "pt-BR"
}

/**
 * Formata para exibição: "1.19 ETH". Arredonda (meio para cima) apenas na apresentação.
 */
export function formatEth(value: EthAmount, { minDecimals = 2, maxDecimals = 6, locale = "figma" }: FormatOptions = {}) {
  const rounded = new Eth(value).toDecimalPlaces(maxDecimals)
  const decimals = Math.max(minDecimals, Math.min(maxDecimals, rounded.decimalPlaces()))
  const text = rounded.toFixed(decimals)
  return `${locale === "pt-BR" ? text.replace(".", ",") : text} ETH`
}
