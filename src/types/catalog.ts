export type EthAmount = string

export interface NftSummary {
  id: string
  name: string
  image: string
  priceEth: EthAmount
  previousPriceEth?: EthAmount | null
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
