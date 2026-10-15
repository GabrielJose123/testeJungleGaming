import { useState } from "react"

import { isApiError } from "@/api/errors"
import { useChangePassword, useProfile, useUpdateAvatar, useUpdateProfile } from "@/api/hooks/account"
import type { Profile } from "@/api/types"
import { ErrorState } from "@/components/feedback"
import { PrimaryButton, Shimmer, TextField } from "@/components/kit"
import { buttonStyles } from "@/components/kit-styles"
import { errorMessage } from "@/lib/error-message"
import { cn } from "@/lib/utils"

import { AccountLayout } from "./account-layout"

export function ProfilePage() {
  const profile = useProfile()

  return (
    <AccountLayout active="profile" title="Perfil do colecionador">
      {profile.isPending && (
        <div role="status" aria-label="Carregando perfil" className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Shimmer key={index} className="h-[72px]" />
          ))}
        </div>
      )}
      {profile.isError && <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />}
      {profile.data && (
        <>
          <ProfileForm key={profile.data.id} profile={profile.data} />
          <PasswordForm />
        </>
      )}
    </AccountLayout>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const avatar = useUpdateAvatar()
  const [values, setValues] = useState({ name: profile.name, email: profile.email, bio: profile.bio })
  const fieldErrors = isApiError(update.error) ? update.error.fieldErrors : {}
  const avatarError = isApiError(avatar.error) ? (avatar.error.fieldErrors.avatar ?? avatar.error.message) : avatar.error ? errorMessage(avatar.error) : undefined

  const pickAvatar = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === "string" && avatar.mutate(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <form
      noValidate
      className="grid gap-x-7 gap-y-6 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault()
        update.mutate(values)
      }}
    >
      <TextField label="Nome de exibição" required autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} error={fieldErrors.name} />
      <TextField label="E-mail" required type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} error={fieldErrors.email} />
      <TextField label="Bio" value={values.bio} maxLength={280} onChange={(event) => setValues({ ...values, bio: event.target.value })} error={fieldErrors.bio} />

      <div className="flex flex-col gap-3">
        <span className="text-body text-cream">Avatar</span>
        <div className="flex items-center gap-6">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Seu avatar" width={50} height={50} className="size-[50px] rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex size-[50px] items-center justify-center rounded-full border border-line-soft bg-surface-card text-title text-amber">
              {profile.name[0]?.toUpperCase()}
            </span>
          )}
          <label className={cn(buttonStyles.primary, "h-10 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-amber")}>
            {avatar.isPending ? "Enviando…" : "Alterar"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => pickAvatar(event.target.files?.[0])} />
          </label>
        </div>
        {avatarError && (
          <p role="alert" className="text-caption text-danger">
            {avatarError}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 lg:col-span-2">
        <PrimaryButton type="submit" disabled={update.isPending} className="w-[131px]">
          {update.isPending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <p role="status" aria-live="polite" className="text-body">
          {update.isSuccess && <span className="text-cream">Perfil atualizado.</span>}
          {update.isError && !Object.keys(fieldErrors).length && <span className="text-danger">{errorMessage(update.error)}</span>}
        </p>
      </div>
    </form>
  )
}

function PasswordForm() {
  const change = useChangePassword()
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirm: "" })
  const [mismatch, setMismatch] = useState(false)
  const fieldErrors = isApiError(change.error) ? change.error.fieldErrors : {}

  return (
    <form
      noValidate
      aria-labelledby="password-title"
      className="flex flex-col gap-6 lg:max-w-[417px]"
      onSubmit={(event) => {
        event.preventDefault()
        if (values.newPassword !== values.confirm) return setMismatch(true)
        setMismatch(false)
        change.mutate(
          { currentPassword: values.currentPassword, newPassword: values.newPassword },
          { onSuccess: () => setValues({ currentPassword: "", newPassword: "", confirm: "" }) },
        )
      }}
    >
      <h2 id="password-title" className="text-body-lg font-bold text-cream">
        Alterar senha
      </h2>
      <TextField label="Senha atual" type="password" autoComplete="current-password" value={values.currentPassword} onChange={(event) => setValues({ ...values, currentPassword: event.target.value })} error={fieldErrors.currentPassword} />
      <TextField label="Nova senha" type="password" autoComplete="new-password" value={values.newPassword} onChange={(event) => setValues({ ...values, newPassword: event.target.value })} error={fieldErrors.newPassword} />
      <TextField
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        value={values.confirm}
        onChange={(event) => setValues({ ...values, confirm: event.target.value })}
        error={mismatch ? "As senhas não coincidem." : undefined}
      />
      <div className="flex items-center gap-4">
        <PrimaryButton type="submit" disabled={change.isPending} className="w-[131px]">
          {change.isPending ? "Salvando…" : "Salvar"}
        </PrimaryButton>
        <p role="status" aria-live="polite" className="text-body">
          {change.isSuccess && <span className="text-cream">Senha alterada.</span>}
          {change.isError && !Object.keys(fieldErrors).length && <span className="text-danger">{errorMessage(change.error)}</span>}
        </p>
      </div>
    </form>
  )
}
