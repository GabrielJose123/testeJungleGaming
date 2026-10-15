import { getRouteApi, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useRegister } from "@/api/hooks/session"
import { PrimaryButton, SocialLogin, TextField } from "@/components/kit"
import { errorMessage } from "@/lib/error-message"
import { safeRedirect } from "@/session/redirects"

import { AuthCard } from "./auth-card"

const route = getRouteApi("/cadastro")

export function RegisterPage() {
  const search = route.useSearch()
  const router = useRouter()
  const register = useRegister()
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" })
  const [mismatch, setMismatch] = useState(false)
  const fieldErrors = isApiError(register.error) ? register.error.fieldErrors : {}
  const set = (name: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [name]: event.target.value }))

  return (
    <AuthCard mode="register" redirect={search.redirect} intro="Criar perfil de colecionador">
      <form
        noValidate
        className="flex w-full flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (values.password !== values.confirm) {
            setMismatch(true)
            return
          }
          setMismatch(false)
          const { confirm: _confirm, ...body } = values
          register.mutate(body, { onSuccess: () => router.history.push(safeRedirect(search.redirect) ?? "/") })
        }}
      >
        <TextField label="Nome de usuário" hideLabel autoComplete="name" placeholder="Nome de usuário" value={values.name} onChange={set("name")} error={fieldErrors.name} />
        <TextField label="E-mail" hideLabel type="email" autoComplete="email" placeholder="Digite seu e-mail" value={values.email} onChange={set("email")} error={fieldErrors.email} />
        <TextField label="Senha" hideLabel type="password" autoComplete="new-password" placeholder="Senha" value={values.password} onChange={set("password")} error={fieldErrors.password} />
        <TextField
          label="Confirmar senha"
          hideLabel
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          value={values.confirm}
          onChange={set("confirm")}
          error={mismatch ? "As senhas não coincidem." : undefined}
        />
        {register.error && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-body text-danger">
            {errorMessage(register.error)}
          </p>
        )}
        <PrimaryButton type="submit" disabled={register.isPending} className="mt-5 h-14 rounded-xl lg:h-11 lg:rounded-xs">
          {register.isPending ? "Criando…" : "Criar perfil"}
        </PrimaryButton>
      </form>
      <SocialLogin />
      <p className="text-body text-sand">
        Já tem uma conta?{" "}
        <Link to="/entrar" search={{ redirect: search.redirect }} className="text-amber hover:underline">
          Entre
        </Link>
      </p>
    </AuthCard>
  )
}
