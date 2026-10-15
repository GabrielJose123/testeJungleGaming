import { isApiError } from "@/api/errors"

/** Mensagem amigável para qualquer erro vindo dos hooks. */
export function errorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.code === "NETWORK_ERROR") return "Sem conexão com o servidor. Verifique sua internet."
    if (error.code === "TIMEOUT") return "O servidor demorou para responder."
    return error.message
  }
  return "Algo deu errado."
}
