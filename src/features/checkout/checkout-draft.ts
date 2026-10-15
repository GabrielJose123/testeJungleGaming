import type { CollectorDetails, Network } from "@/api/types"

/**
 * Rascunho do checkout em sessionStorage: se a sessão expirar no meio da compra, o usuário
 * volta do login e encontra os dados preenchidos (o carrinho já vive no servidor).
 */
export interface CheckoutDraft {
  collector: CollectorDetails
  walletId: string
  network: Network
}

const DRAFT_KEY = "kurio:checkout-draft"

export const emptyCollector: CollectorDetails = { fullName: "", email: "", phone: "", country: "Brasil" }

export function readCheckoutDraft(): Partial<CheckoutDraft> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<CheckoutDraft>
  } catch {
    return {}
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // storage indisponível
  }
}

export function clearCheckoutDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}
