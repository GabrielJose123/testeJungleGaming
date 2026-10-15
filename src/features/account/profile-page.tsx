import { Link } from "@tanstack/react-router"

import { useProfile } from "@/api/hooks/account"
import { useLogout } from "@/api/hooks/session"
import { ErrorState, LoadingState } from "@/components/feedback"
import { ScreenPlaceholder } from "@/components/layout/screen-placeholder"
import { Button } from "@/components/ui/button"

/** Perfil provisório: dados vindos da API e logout. Edição chega com o layout do Figma. */
export function ProfilePage() {
  const profile = useProfile()
  const logout = useLogout()

  return (
    <ScreenPlaceholder title="Perfil do colecionador" nav="home">
      {profile.isPending && <LoadingState />}
      {profile.isError && <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />}
      {profile.data && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>Nome</dt>
          <dd className="text-cream">{profile.data.name}</dd>
          <dt>E-mail</dt>
          <dd className="text-cream">{profile.data.email}</dd>
          <dt>Bio</dt>
          <dd className="text-cream">{profile.data.bio || "—"}</dd>
        </dl>
      )}
      <Link to="/carteiras" className="text-amber underline">
        Minhas carteiras
      </Link>
      <Button variant="outline" disabled={logout.isPending} onClick={() => logout.mutate()} className="self-start">
        Sair
      </Button>
    </ScreenPlaceholder>
  )
}
