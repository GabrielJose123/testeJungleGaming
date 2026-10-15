/** Valores em ETH trafegam como strings decimais (ver docs/spec.md §3). */
export type EthAmount = string

export interface NftSummary {
  id: string
  name: string
  image: string
  priceEth: EthAmount
  /** Preço anterior, exibido ao lado do atual quando há redução. */
  previousPriceEth?: EthAmount | null
  /** Selo curto sobre a arte (ex.: "RARO"). */
  badge?: string | null
}

export interface FilterOption {
  id: string
  label: string
  count: number
}

export interface PriceRange {
  min: number
  max: number
}

export interface BlogPost {
  id: string
  date: string
  readTime: string
  title: string
  excerpt: string
  image: string
}

export interface PromoCard {
  id: string
  title: [string, string]
  description: string
  image: string
  ctaLabel: string
}
