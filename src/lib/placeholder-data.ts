/**
 * Dados estáticos TEMPORÁRIOS, copiados do Figma, para montar a camada visual.
 * Serão substituídos por TanStack Query + MSW. Não adicione lógica de negócio aqui.
 */
import type { BlogPost, FilterOption, NftSummary, PriceRange, PromoCard } from "@/types/catalog"

export const nftImages = {
  varsity: "/assets/nfts/ape-varsity.png",
  hoodie: "/assets/nfts/ape-hoodie.png",
  sage: "/assets/nfts/ape-sage.png",
  golden: "/assets/nfts/ape-golden.png",
} as const

export const catalogNfts: NftSummary[] = [
  { id: "emerald-ape-042", name: "Emerald Ape #042", image: nftImages.varsity, priceEth: "1.19" },
  { id: "sage-nomad-009", name: "Sage Nomad #009", image: nftImages.hoodie, priceEth: "1.69" },
  {
    id: "neon-vessel-552",
    name: "Neon Vessel #552",
    image: nftImages.sage,
    priceEth: "1.99",
    previousPriceEth: "2.29",
    badge: "RARO",
  },
  { id: "cosmic-bloom-118", name: "Cosmic Bloom #118", image: nftImages.hoodie, priceEth: "1.29" },
  { id: "violet-nomad-314", name: "Violet Nomad #314", image: nftImages.hoodie, priceEth: "1.39" },
  { id: "ivory-baron-088", name: "Ivory Baron #088", image: nftImages.sage, priceEth: "1.79" },
  { id: "golden-beat-207", name: "Golden Beat #207", image: nftImages.golden, priceEth: "0.99" },
  // O card equivalente no Figma não tem título nem preço; nome e valor são provisórios.
  { id: "golden-pulse-121", name: "Golden Pulse #121", image: nftImages.golden, priceEth: "0.59" },
  { id: "golden-signal-160", name: "Golden Signal #160", image: nftImages.golden, priceEth: "0.39" },
]

export const featuredNft: NftSummary = {
  id: "sage-nomad-009",
  name: "Sage Nomad #009",
  image: nftImages.hoodie,
  priceEth: "1.69",
}

export const heroNft: NftSummary = catalogNfts[0]

export const collectionFilters: FilterOption[] = [
  { id: "arte-digital", label: "Arte digital", count: 33 },
  { id: "fotografia", label: "Fotografia", count: 12 },
  { id: "musica", label: "Música", count: 65 },
  { id: "arte-3d", label: "Arte 3D", count: 39 },
  { id: "colecionaveis", label: "Colecionáveis", count: 23 },
  { id: "generativa", label: "Generativa", count: 17 },
  { id: "jogos", label: "Jogos", count: 19 },
  { id: "assinaturas", label: "Assinaturas", count: 13 },
  { id: "utilidade", label: "Utilidade", count: 18 },
]

export const networkFilters: FilterOption[] = [
  { id: "ethereum", label: "Ethereum", count: 119 },
  { id: "polygon", label: "Polygon", count: 78 },
  { id: "solana", label: "Solana", count: 86 },
]

export const priceBounds: PriceRange = { min: 0.02, max: 12.3 }

/** Rótulos das abas e da ordenação; os ids são os valores aceitos pela API (`tab`, `sort`). */
export const catalogTabs = [
  { id: "all", label: "Todos os NFTs" },
  { id: "new", label: "Novos lançamentos" },
  { id: "trending", label: "Em alta" },
] as const

export const sortOptions = [
  { id: "recent", label: "Listados recentemente" },
  { id: "price-asc", label: "Menor preço" },
  { id: "price-desc", label: "Maior preço" },
  { id: "name-asc", label: "Nome (A–Z)" },
] as const

export const promoCards: PromoCard[] = [
  {
    id: "genesis",
    title: ["Lançamentos gênesis", "de edição limitada"],
    description: "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
    image: nftImages.varsity,
    ctaLabel: "Explorar",
  },
  {
    id: "curadoria",
    title: ["Arte digital selecionada", "e muito mais"],
    description: "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
    image: nftImages.sage,
    ctaLabel: "Explorar",
  },
]

export const blogPosts: BlogPost[] = [
  {
    id: "propriedade",
    date: "12 de setembro",
    readTime: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    excerpt: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    image: nftImages.sage,
  },
  {
    id: "artistas",
    date: "13 de setembro",
    readTime: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    excerpt: "Conheça criadores que moldam a cultura digital.",
    image: nftImages.varsity,
  },
  {
    id: "raridade",
    date: "15 de setembro",
    readTime: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    excerpt: "Entenda raridade, procedência, direitos autorais e utilidade.",
    image: nftImages.hoodie,
  },
  {
    id: "carteira",
    date: "15 de setembro",
    readTime: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    excerpt: "Proteja sua carteira, seus ativos e sua identidade.",
    image: nftImages.golden,
  },
]

