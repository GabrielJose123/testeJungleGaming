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

export const targets = { performance: 90, accessibility: 95, "best-practices": 95, seo: 90 }
