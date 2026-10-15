import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { refreshSession } from "@/session/session-store"
import { useCurrentUserId } from "@/session/use-session"

import { profileApi, walletsApi } from "../endpoints"
import { queryKeys } from "../query-keys"
import type { CreateWalletRequest, Profile, UpdateProfileRequest, UpdateWalletRequest, Wallet, WalletListResponse } from "../types"

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export function useProfile() {
  const userId = useCurrentUserId()
  return useQuery({
    queryKey: queryKeys.private.profile(userId ?? "anonymous"),
    queryFn: ({ signal }) => profileApi.get({ signal }),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

/** Mantém cache do perfil e dados da sessão (nome/e-mail/avatar no cabeçalho) em sincronia. */
function useProfileMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Profile>) {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()
  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      if (userId) queryClient.setQueryData(queryKeys.private.profile(userId), profile)
      refreshSession({ user: profile })
    },
  })
}

export function useUpdateProfile() {
  return useProfileMutation((body: UpdateProfileRequest) => profileApi.update(body))
}

export function useUpdateAvatar() {
  return useProfileMutation((dataUrl: string) => profileApi.updateAvatar({ dataUrl }))
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword })
}

// ---------------------------------------------------------------------------
// Carteiras
// ---------------------------------------------------------------------------

export function useWallets() {
  const userId = useCurrentUserId()
  return useQuery({
    queryKey: queryKeys.private.wallets(userId ?? "anonymous"),
    queryFn: ({ signal }) => walletsApi.list({ signal }),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

function useWalletMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Wallet>) {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()
  return useMutation({
    mutationFn,
    onSuccess: (wallet) => {
      if (!userId) return
      queryClient.setQueryData<WalletListResponse>(queryKeys.private.wallets(userId), (current) => {
        const items = current?.items ?? []
        const exists = items.some((item) => item.id === wallet.id)
        return { items: exists ? items.map((item) => (item.id === wallet.id ? wallet : item)) : [...items, wallet] }
      })
    },
  })
}

export function useCreateWallet() {
  return useWalletMutation((body: CreateWalletRequest) => walletsApi.create(body))
}

export function useUpdateWallet() {
  return useWalletMutation(({ id, ...body }: UpdateWalletRequest & { id: string }) => walletsApi.update(id, body))
}

/** Simula a conexão (pode ser recusada: 403 WALLET_REJECTED). */
export function useConnectWallet() {
  return useWalletMutation((id: string) => walletsApi.connect(id))
}

export function useDisconnectWallet() {
  return useWalletMutation((id: string) => walletsApi.disconnect(id))
}
