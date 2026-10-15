import axios from "axios"

import { expireSession, getGuestCartId, getToken } from "@/session/session-store"

import { API_URL, REQUEST_TIMEOUT_MS } from "./config"
import { toApiError } from "./errors"

/**
 * Instância única do Axios. Toda chamada REST passa por aqui:
 * - anexa `Authorization` (sessão) ou `X-Cart-Id` (carrinho de visitante);
 * - normaliza falhas em `ApiError`;
 * - encerra a sessão local ao receber 401 de sessão inválida/expirada para o token atual.
 */
export const http = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set("Authorization", `Bearer ${token}`)
  else config.headers.set("X-Cart-Id", getGuestCartId())
  return config
})

const SESSION_ERROR_CODES = new Set(["SESSION_EXPIRED", "UNAUTHENTICATED"])

http.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  if (apiError.status === 401 && SESSION_ERROR_CODES.has(apiError.code)) {
    // Só expira se o 401 se refere ao token ainda ativo (evita corrida com um login novo).
    const sentToken = axios.isAxiosError(error) ? String(error.config?.headers?.Authorization ?? "").replace("Bearer ", "") : ""
    if (sentToken && sentToken === getToken()) expireSession()
  }
  return Promise.reject(apiError)
})
