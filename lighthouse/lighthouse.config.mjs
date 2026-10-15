/**
 * Configuração versionada da auditoria Lighthouse (docs/spec.md §10).
 * Perfis: mobile (padrão do Lighthouse: Moto G Power, 4G lento simulado, CPU 4×) e
 * desktop (preset oficial `desktop-config`). Ambos auditam as 4 categorias exigidas.
 */
import desktopConfig from "lighthouse/core/config/desktop-config.js"

const categories = ["performance", "accessibility", "best-practices", "seo"]

export const pages = [
  { slug: "inicio", path: "/" },
  { slug: "detalhe", path: "/nft/emerald-ape-042" },
]

export const runsPerProfile = 3

export const profiles = {
  mobile: {
    extends: "lighthouse:default",
    settings: { onlyCategories: categories },
  },
  desktop: {
    ...desktopConfig,
    settings: { ...desktopConfig.settings, onlyCategories: categories },
  },
}

/** Metas do desafio (0–100). */
export const targets = { performance: 90, accessibility: 95, "best-practices": 95, seo: 90 }
