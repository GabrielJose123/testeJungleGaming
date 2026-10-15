import { AxiosError, isAxiosError, isCancel } from "axios"

import type { ApiErrorBody, ApiErrorCode, ClientErrorCode, FieldErrors } from "./types"

/** Erro normalizado que chega aos hooks e à interface — vindo da API ou do próprio cliente. */
export class ApiError extends Error {
  readonly code: ApiErrorCode | ClientErrorCode
  /** 0 quando não houve resposta HTTP. */
  readonly status: number
  readonly retryable: boolean
  readonly fieldErrors: FieldErrors
  readonly details?: unknown

  constructor(init: {
    code: ApiErrorCode | ClientErrorCode
    status: number
    message: string
    retryable: boolean
    fieldErrors?: FieldErrors
    details?: unknown
  }) {
    super(init.message)
    this.name = "ApiError"
    this.code = init.code
    this.status = init.status
    this.retryable = init.retryable
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details
  }
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === "object" && data !== null && "error" in data && typeof (data as ApiErrorBody).error?.code === "string"
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isCancel(error)) {
    return new ApiError({ code: "CANCELED", status: 0, message: "Requisição cancelada.", retryable: false })
  }

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError
    if (axiosError.code === AxiosError.ECONNABORTED || axiosError.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ code: "TIMEOUT", status: 0, message: "O servidor demorou para responder.", retryable: true })
    }
    const response = axiosError.response
    if (!response) {
      return new ApiError({ code: "NETWORK_ERROR", status: 0, message: "Sem conexão com o servidor.", retryable: true })
    }
    if (isErrorBody(response.data)) {
      const { code, message, retryable, fieldErrors, details } = response.data.error
      return new ApiError({ code, status: response.status, message, retryable, fieldErrors, details })
    }
    return new ApiError({
      code: response.status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN",
      status: response.status,
      message: "Resposta inesperada do servidor.",
      retryable: response.status >= 500,
    })
  }

  return new ApiError({
    code: "UNKNOWN",
    status: 0,
    message: error instanceof Error ? error.message : "Erro inesperado.",
    retryable: false,
  })
}

export function isApiError(error: unknown, code?: ApiError["code"]): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

export function isRetryable(error: unknown) {
  return error instanceof ApiError && error.retryable
}

/** Falha sem resposta: o servidor pode ter processado a requisição. */
export function isTransportFailure(error: unknown) {
  return isApiError(error, "NETWORK_ERROR") || isApiError(error, "TIMEOUT")
}
