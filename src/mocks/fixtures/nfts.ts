import type { Edition, Network } from "@/api/types"
import { eth, toEthAmount } from "@/lib/money"

import type { CollectionRecord, NftRecord } from "../db/schema"
import { createRandom } from "../random"

/**
 * 48 NFTs determinísticos. Os 9 primeiros reproduzem o catálogo do Figma (nomes e preços);
 * os demais variam coleção, rede, preço, tiragem e estoque para exercitar filtros e paginação.
 */

export const collections: CollectionRecord[] = [
  { id: "arte-digital", name: "Arte digital" },
  { id: "fotografia", name: "Fotografia" },
  { id: "musica", name: "Música" },
  { id: "arte-3d", name: "Arte 3D" },
  { id: "colecionaveis", name: "Colecionáveis" },
  { id: "generativa", name: "Generativa" },
  { id: "jogos", name: "Jogos" },
  { id: "assinaturas", name: "Assinaturas" },
  { id: "utilidade", name: "Utilidade" },
]

const images = {
  varsity: "/assets/nfts/ape-varsity.png",
  hoodie: "/assets/nfts/ape-hoodie.png",
  sage: "/assets/nfts/ape-sage.png",
  golden: "/assets/nfts/ape-golden.png",
} as const
type ImageKey = keyof typeof images

interface Seed {
  name: string
  image: ImageKey
  priceEth: string
  previousPriceEth?: string
  badge?: string
  collectionId?: string
  network?: Network
}

/** Catálogo do Figma (Desktop / Início). */
const figmaSeeds: Seed[] = [
  { name: "Emerald Ape #042", image: "varsity", priceEth: "1.19", collectionId: "arte-digital", network: "ethereum" },
  { name: "Sage Nomad #009", image: "hoodie", priceEth: "1.69", collectionId: "arte-digital", network: "ethereum" },
  {
    name: "Neon Vessel #552",
    image: "sage",
    priceEth: "1.99",
    previousPriceEth: "2.29",
    badge: "RARO",
    collectionId: "arte-3d",
    network: "ethereum",
  },
  { name: "Cosmic Bloom #118", image: "hoodie", priceEth: "1.29", collectionId: "generativa", network: "polygon" },
  { name: "Violet Nomad #314", image: "hoodie", priceEth: "1.39", collectionId: "colecionaveis", network: "ethereum" },
  { name: "Ivory Baron #088", image: "sage", priceEth: "1.79", collectionId: "arte-digital", network: "solana" },
  { name: "Golden Beat #207", image: "golden", priceEth: "0.99", collectionId: "musica", network: "polygon" },
  { name: "Golden Pulse #121", image: "golden", priceEth: "0.59", collectionId: "musica", network: "ethereum" },
  { name: "Golden Signal #160", image: "golden", priceEth: "0.39", collectionId: "musica", network: "solana" },
]

const adjectives = ["Crimson", "Azure", "Onyx", "Amber", "Jade", "Lunar", "Solar", "Rust", "Velvet", "Copper", "Misty", "Ember", "Silent"]
const nouns = ["Ape", "Nomad", "Vessel", "Bloom", "Baron", "Beat", "Signal", "Drift", "Echo", "Oracle", "Rider", "Totem", "Monk"]
const creators = ["Nova Sato", "Lia Prado", "Kenji Arruda", "Maya Torres", "Theo Kim", "Rui Okafor"]
const traitPool = ["Óculos", "Esmeralda", "Raro", "Capuz", "Fones", "Chapéu", "Jaqueta", "Dourado", "Neon", "Holográfico", "Animado", "Lendário"]
const networks: Network[] = ["ethereum", "polygon", "solana"]
const imageKeys: ImageKey[] = ["varsity", "hoodie", "sage", "golden"]

/** Momento de referência do catálogo: os mais recentes são "Novos lançamentos". */
export const CATALOG_REFERENCE_DATE = Date.UTC(2026, 9, 1)
const DAY = 86_400_000

function scale(price: string, factor: string) {
  return toEthAmount(eth(price).times(factor).toDecimalPlaces(2))
}

function buildEditions(price: string, random: () => number, figma: boolean, index: number): Edition[] {
  const tenAvailable = Math.floor(random() * 11)
  const oneSold = !figma && index % 5 === 0
  const openAvailable = !figma && index % 4 === 0
  return [
    {
      id: "1-1",
      label: "1/1",
      supply: 1,
      available: oneSold ? 0 : 1,
      priceEth: scale(price, "3"),
      maxPerOrder: 1,
      status: oneSold ? "sold-out" : "available",
    },
    {
      id: "1-10",
      label: "1/10",
      supply: 10,
      available: figma ? 6 : tenAvailable,
      priceEth: scale(price, "1.5"),
      maxPerOrder: 2,
      status: figma || tenAvailable > 0 ? "available" : "sold-out",
    },
    {
      id: "1-50",
      label: "1/50",
      supply: 50,
      available: figma ? 32 : 5 + Math.floor(random() * 45),
      priceEth: price,
      maxPerOrder: 5,
      status: "available",
    },
    {
      id: "aberta",
      label: "Aberta",
      supply: null,
      available: openAvailable ? 999 : 0,
      priceEth: scale(price, "0.8"),
      maxPerOrder: 10,
      status: openAvailable ? "available" : "unavailable",
    },
  ]
}

function buildNft(seed: Seed, index: number, random: () => number, figma: boolean): NftRecord {
  const number = String(index + 1).padStart(4, "0")
  const creator = creators[index % creators.length]
  const attributes = Array.from(new Set([traitPool[index % traitPool.length], traitPool[(index * 7 + 3) % traitPool.length], index % 3 === 0 ? "Raro" : "Comum"]))
  const id = seed.name
    .toLowerCase()
    .replace(/#/g, "")
    .trim()
    .replace(/\s+/g, "-")
  return {
    id,
    name: seed.name,
    image: images[seed.image],
    collectionId: seed.collectionId ?? collections[index % collections.length].id,
    network: seed.network ?? networks[index % networks.length],
    previousPriceEth: seed.previousPriceEth ?? null,
    badge: seed.badge ?? null,
    createdAt: new Date(CATALOG_REFERENCE_DATE - index * 2 * DAY).toISOString(),
    trendingScore: Math.round(random() * 100),
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na rede, com arte desbloqueável e acesso para colecionadores.`,
    story: [
      `${seed.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    tokenId: `#${number}`,
    contract: `0x7A42${number}${"0".repeat(28)}19E8`,
    royaltyPercent: 5,
    attributes,
    rating: { average: Math.round((3.5 + random() * 1.5) * 10) / 10, count: 3 + Math.floor(random() * 40) },
    gallery: [images[seed.image], ...imageKeys.filter((key) => key !== seed.image).map((key) => images[key])],
    creator,
    editions: buildEditions(seed.priceEth, random, figma, index),
    version: 1,
  }
}

export function buildNftFixtures(): NftRecord[] {
  const random = createRandom(42)
  const generated: Seed[] = Array.from({ length: 39 }, (_, offset) => {
    const index = offset + figmaSeeds.length
    const price = (0.02 + random() * 12.28).toFixed(2)
    return {
      name: `${adjectives[index % adjectives.length]} ${nouns[(index * 5) % nouns.length]} #${String(200 + index * 7).padStart(3, "0")}`,
      image: imageKeys[index % imageKeys.length],
      priceEth: price,
      previousPriceEth: index % 9 === 0 ? (Number(price) * 1.15).toFixed(2) : undefined,
      badge: index % 11 === 0 ? "RARO" : undefined,
    }
  })
  return [
    ...figmaSeeds.map((seed, index) => buildNft(seed, index, random, true)),
    ...generated.map((seed, offset) => buildNft(seed, offset + figmaSeeds.length, random, false)),
  ]
}
