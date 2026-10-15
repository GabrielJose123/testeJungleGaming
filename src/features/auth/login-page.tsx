import { getRouteApi, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useLogin } from "@/api/hooks/session"
import { FieldError } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/error-message"
import { safeRedirect } from "@/session/redirects"

const route = getRouteApi("/entrar")

/** Login provisório (sem o layout do Figma): autentica e volta para `redirect`. */
export function LoginPage() {
  const search = route.useSearch()
  const router = useRouter()
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const fieldErrors = isApiError(login.error) ? login.error.fieldErrors : {}

  return (
    <ScreenPlaceholder title="Entrar" nav="home">
      {search.reason === "expired" && (
        <p role="alert" className="text-amber">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          login.mutate(
            { email, password },
            { onSuccess: () => router.history.push(safeRedirect(search.redirect) ?? "/") },
          )
        }}
      >
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby="login-email-error"
        />
        <FieldError id="login-email-error" message={fieldErrors.email} />
        <Label htmlFor="login-password">Senha</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby="login-password-error"
        />
        <FieldError id="login-password-error" message={fieldErrors.password} />
        {login.error && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-danger">
            {errorMessage(login.error)}
          </p>
        )}
        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p>
        Não tem conta?{" "}
        <Link to="/cadastro" search={{ redirect: search.redirect }} className="text-amber underline">
          Criar conta
        </Link>
      </p>
    </ScreenPlaceholder>
  )
}
