import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useCurrentUserId } from "@/session/use-session"

import { favoritesApi } from "../endpoints"
import { queryKeys } from "../query-keys"
import type { FavoritesResponse } from "../types"

export function useFavorites() {
  const userId = useCurrentUserId()
  return useQuery({
    queryKey: queryKeys.private.favorites(userId ?? "anonymous"),
    queryFn: ({ signal }) => favoritesApi.list({ signal }),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

export function useIsFavorite(nftId: string) {
  const { data } = useFavorites()
  return data?.nftIds.includes(nftId) ?? false
}

interface ToggleVariables {
  nftId: string
  favorite: boolean
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const userId = useCurrentUserId()
  const key = queryKeys.private.favorites(userId ?? "anonymous")

  return useMutation({
    mutationFn: ({ nftId, favorite }: ToggleVariables) => (favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId)),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (current) => {
        const ids = new Set(current?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(key, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
