import { expect, test } from "./fixtures"

/**
 * Fumaça: o app sobe com os mocks, o catálogo vem do MSW e a navegação até o detalhe funciona,
 * nos viewports desktop e mobile.
 */
test("catálogo carrega da API simulada e leva ao detalhe do NFT", async ({ page }) => {
  await page.goto("/")

  const catalog = page.locator("#catalogo")
  const firstCard = catalog.getByRole("article").first()
  await expect(firstCard).toBeVisible()
  await expect(catalog.getByRole("article")).toHaveCount(9)
  await expect(catalog.getByRole("link", { name: "Emerald Ape #042" })).toBeVisible()

  await catalog.getByRole("link", { name: "Emerald Ape #042" }).click()
  await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible()
})

test("socket conecta e reflete mudança de preço no detalhe", async ({ page, mock }) => {
  await page.goto("/nft/emerald-ape-042")
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible()
  await expect(page.getByText(/^1\.19 ETH/)).toBeVisible()

  await mock.updateNft("emerald-ape-042", { editionId: "1-50", priceEth: "1.45" })
  await expect(page.getByText(/^1\.45 ETH/)).toBeVisible()
})
