import { HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from "msw"

import type { ApiErrorBody } from "@/api/types"

import { bearerToken, resolveSession, type AuthContext } from "../domain/auth"
import { MockApiError } from "../domain/errors"
import { applyNetworkConditions, getScenario, type RouteKind } from "../scenarios"

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"

export function api(path: string) {
  return `${API_BASE}${path}`
}

type AuthMode = "none" | "optional" | "required"

export interface RouteContext<Params extends PathParams> {
  request: Request
  params: Params
  url: URL
  auth: AuthContext | null
}

export interface AuthedRouteContext<Params extends PathParams> extends RouteContext<Params> {
  auth: AuthContext
}

export function errorResponse(error: MockApiError) {
  return HttpResponse.json<ApiErrorBody>({ error: error.toPayload() }, { status: error.status })
}

export async function readJson<T extends object>(request: Request): Promise<Partial<T>> {
  try {
    const body: unknown = await request.json()
    return body && typeof body === "object" ? (body as Partial<T>) : {}
  } catch {
    return {}
  }
}

export function json<T extends DefaultBodyType>(body: T, status = 200) {
  return HttpResponse.json(body, { status })
}

export function noContent() {
  return new HttpResponse(null, { status: 204 })
}

function resolveAuth(request: Request, mode: AuthMode): AuthContext | null {
  if (mode === "none") return null
  const token = bearerToken(request)
  if (token && getScenario() === "session-expired") {
    throw new MockApiError(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para continuar.")
  }
  const auth = resolveSession(token)
  if (mode === "required" && !auth) throw new MockApiError(401, "UNAUTHENTICATED", "Entre na sua conta para continuar.")
  return auth
}

export function route<Params extends PathParams = PathParams>(
  kind: RouteKind,
  mode: "required",
  handler: (context: AuthedRouteContext<Params>) => Response | Promise<Response>,
): HttpResponseResolver<Params>
export function route<Params extends PathParams = PathParams>(
  kind: RouteKind,
  mode: "none" | "optional",
  handler: (context: RouteContext<Params>) => Response | Promise<Response>,
): HttpResponseResolver<Params>
export function route<Params extends PathParams = PathParams>(
  kind: RouteKind,
  mode: AuthMode,
  handler: (context: AuthedRouteContext<Params>) => Response | Promise<Response>,
): HttpResponseResolver<Params> {
  return async ({ request, params }) => {
    const interrupted = await applyNetworkConditions(request, kind)
    if (interrupted) return interrupted
    try {
      const auth = resolveAuth(request, mode)
      return await handler({ request, params, url: new URL(request.url), auth: auth as AuthContext })
    } catch (error) {
      if (error instanceof MockApiError) return errorResponse(error)
      console.error("[mocks] erro inesperado", error)
      return errorResponse(new MockApiError(500, "INTERNAL_ERROR", "Erro interno do servidor simulado."))
    }
  }
}
