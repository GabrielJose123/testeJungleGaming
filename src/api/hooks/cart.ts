import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { usePrivateScope } from "@/session/use-session"

import { cartApi } from "../endpoints"
import { isApiError } from "../errors"
import { queryKeys } from "../query-keys"
import type { AddCartItemRequest, Cart } from "../types"

export function useCart() {
  const scope = usePrivateScope()
  return useQuery({
    queryKey: queryKeys.private.cart(scope),
    queryFn: ({ signal }) => cartApi.get({ signal }),
    staleTime: 0,
  })
}

function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const key = queryKeys.private.cart(usePrivateScope())
  return useMutation({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
    onError: (error) => {
      if (isApiError(error) && error.status === 409) void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useAddToCart() {
  return useCartMutation((body: AddCartItemRequest) => cartApi.addItem(body))
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, { quantity }))
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: string) => cartApi.removeItem(itemId))
}

export function useApplyCoupon() {
  return useCartMutation((code: string) => cartApi.applyCoupon({ code }))
}

export function useRemoveCoupon() {
  return useCartMutation(() => cartApi.removeCoupon())
}

export function useCartCount() {
  const { data } = useCart()
  return data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}
