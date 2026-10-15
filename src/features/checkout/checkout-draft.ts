import type { CollectorDetails, Network } from "@/api/types"

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
  }
}

export function clearCheckoutDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
  }
}
