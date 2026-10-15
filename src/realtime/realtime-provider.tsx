import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { startRealtime } from "./realtime-client"

/** Mantém a conexão Socket.IO enquanto montado; desmontar remove listeners e desconecta. */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  useEffect(() => startRealtime(queryClient), [queryClient])
  return children
}
