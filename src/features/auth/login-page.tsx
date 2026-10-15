import { getRouteApi, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useLogin } from "@/api/hooks/session"
import { PrimaryButton, SocialLogin, TextField } from "@/components/kit"
import { errorMessage } from "@/lib/error-message"
import { safeRedirect } from "@/session/redirects"

import { AuthCard } from "./auth-card"

const route = getRouteApi("/entrar")

/** Figma: Desktop / Login (9:115) e Mobile / Login (16:1022). Autentica e volta para `redirect`. */
export function LoginPage() {
  const search = route.useSearch()
  const router = useRouter()
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const fieldErrors = isApiError(login.error) ? login.error.fieldErrors : {}

  return (
    <AuthCard mode="login" redirect={search.redirect} intro="Entre para gerenciar sua carteira, coleção e perfil de criador.">
      {search.reason === "expired" && (
        <p role="alert" className="w-full rounded-xs border border-brand px-3 py-2 text-body text-amber">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form
        noValidate
        className="flex w-full flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          login.mutate({ email, password }, { onSuccess: () => router.history.push(safeRedirect(search.redirect) ?? "/") })
        }}
      >
        <TextField label="E-mail" hideLabel type="email" autoComplete="email" placeholder="contato@email.com" value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors.email} />
        <TextField
          label="Senha"
          hideLabel
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <span className="self-end text-caption text-amber" title="Recuperação de senha fora do escopo da demonstração">
          Esqueceu a senha?
        </span>
        {login.error && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-body text-danger">
            {errorMessage(login.error)}
          </p>
        )}
        <PrimaryButton type="submit" disabled={login.isPending} className="mt-3 h-14 rounded-xl lg:h-11 lg:rounded-xs">
          {login.isPending ? "Entrando…" : "Entrar"}
        </PrimaryButton>
      </form>
      <SocialLogin />
      <p className="text-body text-sand">
        Não tem conta?{" "}
        <Link to="/cadastro" search={{ redirect: search.redirect }} className="text-amber hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthCard>
  )
}
