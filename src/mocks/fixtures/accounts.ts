import type { CouponRecord, UserRecord, WalletRecord } from "../db/schema"

/**
 * Usuários fictícios. Senha de ambos: `Kurio@123` — guardada apenas como hash PBKDF2-SHA256
 * (100 000 iterações, salt por usuário), gerado fora do código.
 */
export const userFixtures: UserRecord[] = [
  {
    id: "user-ana",
    name: "Ana Souza",
    email: "ana@kurio.dev",
    passwordHash:
      "pbkdf2$100000$6b7572696f2d616e612d73616c742d31$d240e0b0e5735d91d3a7b8f02583e49064f87ccacce1499174490356486687f0",
    avatarUrl: null,
    bio: "Colecionadora de arte generativa desde 2021.",
    createdAt: "2025-03-14T12:00:00.000Z",
  },
  {
    id: "user-bruno",
    name: "Bruno Lima",
    email: "bruno@kurio.dev",
    passwordHash:
      "pbkdf2$100000$6b7572696f2d6272756e6f2d73616c74$8fd2f7f869e4e20f542058af6a19353e20b1964cb965e167587a62396b9abb19",
    avatarUrl: null,
    bio: "",
    createdAt: "2025-08-02T12:00:00.000Z",
  },
]

export const walletFixtures: WalletRecord[] = [
  {
    id: "wallet-ana-primary",
    userId: "user-ana",
    label: "MetaMask principal",
    address: "0x9f3c4b7a1d2e8f6a5b4c3d2e1f0a9b8c7d6e5f4a",
    network: "ethereum",
    role: "primary",
    connection: "disconnected",
    createdAt: "2025-03-14T12:10:00.000Z",
    updatedAt: "2025-03-14T12:10:00.000Z",
  },
]

export const favoriteFixtures: Record<string, string[]> = {
  "user-ana": ["sage-nomad-009", "golden-beat-207"],
  "user-bruno": [],
}

export const couponFixtures: CouponRecord[] = [
  { code: "KURIO10", description: "10% de desconto", kind: "percent", value: "10", expiresAt: "2099-12-31T23:59:59.000Z" },
  { code: "BEMVINDO", description: "0.05 ETH de desconto", kind: "fixed", value: "0.05", expiresAt: "2099-12-31T23:59:59.000Z" },
  { code: "EXPIRADO", description: "20% de desconto (vencido)", kind: "percent", value: "20", expiresAt: "2024-01-01T00:00:00.000Z" },
]
