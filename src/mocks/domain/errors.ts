import type { ApiErrorCode, ApiErrorPayload, FieldErrors } from "@/api/types"

const RETRYABLE_STATUSES = new Set([500, 502, 503, 504])

/** Erro de domínio do servidor simulado; os handlers o convertem no envelope `{ error }`. */
export class MockApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors?: FieldErrors
  readonly details?: unknown

  constructor(status: number, code: ApiErrorCode, message: string, extra: { fieldErrors?: FieldErrors; details?: unknown } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = extra.fieldErrors
    this.details = extra.details
  }

  toPayload(): ApiErrorPayload {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: RETRYABLE_STATUSES.has(this.status),
      ...(this.fieldErrors && { fieldErrors: this.fieldErrors }),
      ...(this.details !== undefined && { details: this.details }),
    }
  }
}

export function validationError(fieldErrors: FieldErrors, message = "Revise os campos destacados.") {
  return new MockApiError(400, "VALIDATION_ERROR", message, { fieldErrors })
}

export function notFound(code: ApiErrorCode = "NOT_FOUND", message = "Recurso não encontrado.") {
  return new MockApiError(404, code, message)
}

/** Lança VALIDATION_ERROR se houver algum erro de campo. */
export function assertValid(fieldErrors: FieldErrors) {
  if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)
}
