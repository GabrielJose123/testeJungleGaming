export const API_URL = import.meta.env.VITE_API_URL || "/api"

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window === "undefined" ? "" : window.location.origin)

export const SOCKET_PATH = "/realtime"

export const REQUEST_TIMEOUT_MS = 10_000
