import { getRouteApi, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useRegister } from "@/api/hooks/session"
import { FieldError } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/error-message"
import { safeRedirect } from "@/session/redirects"

const route = getRouteApi("/cadastro")

const fields = [
  { name: "name", label: "Nome", type: "text", autoComplete: "name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "password", label: "Senha", type: "password", autoComplete: "new-password" },
] as const

/** Cadastro provisório: validação e conflito (409) vêm da API. */
export function RegisterPage() {
  const search = route.useSearch()
  const router = useRouter()
  const register = useRegister()
  const [values, setValues] = useState({ name: "", email: "", password: "" })
  const fieldErrors = isApiError(register.error) ? register.error.fieldErrors : {}

  return (
    <ScreenPlaceholder title="Criar conta" nav="home">
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          register.mutate(values, { onSuccess: () => router.history.push(safeRedirect(search.redirect) ?? "/") })
        }}
      >
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={`register-${field.name}`}>{field.label}</Label>
            <Input
              id={`register-${field.name}`}
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              aria-invalid={Boolean(fieldErrors[field.name])}
              aria-describedby={`register-${field.name}-error`}
            />
            <FieldError id={`register-${field.name}-error`} message={fieldErrors[field.name]} />
          </div>
        ))}
        {register.error && !Object.keys(fieldErrors).length && (
          <p role="alert" className="text-danger">
            {errorMessage(register.error)}
          </p>
        )}
        <Button type="submit" disabled={register.isPending}>
          {register.isPending ? "Criando…" : "Criar conta"}
        </Button>
      </form>
      <p>
        Já tem conta?{" "}
        <Link to="/entrar" search={{ redirect: search.redirect }} className="text-amber underline">
          Entrar
        </Link>
      </p>
    </ScreenPlaceholder>
  )
}
