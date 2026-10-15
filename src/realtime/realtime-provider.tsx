import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { startRealtime } from "./realtime-client"

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  useEffect(() => startRealtime(queryClient), [queryClient])
  return children
}
