import type { Network } from "@/api/types"

export const NETWORK_LABELS: Record<Network, string> = { ethereum: "Ethereum", polygon: "Polygon", solana: "Solana" }

/** 0xA91F…E82C — endereço completo fica no `title`. */
export function shortAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
