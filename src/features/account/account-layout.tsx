import { Link } from "@tanstack/react-router"

import { useLogout } from "@/api/hooks/session"
import { PageShell } from "@/components/layout/page-shell"
import { cn } from "@/lib/utils"

const disabledItems = ["Atividade", "Lista de interesse", "Ofertas", "Arquivos baixados", "Suporte"]

export function AccountLayout({ active, title, children }: { active: "profile" | "wallets"; title: string; children: React.ReactNode }) {
  const logout = useLogout()
  const item = (selected: boolean) =>
    cn("flex h-11 items-center gap-3 border-l-[5px] px-4 text-body", selected ? "border-brand text-amber" : "border-transparent text-amber/90 hover:text-cream")

  return (
    <PageShell nav="home" headerDivider mobileTab="profile">
      <div className="grid gap-8 lg:grid-cols-[310px_1fr] lg:gap-7">
        <nav aria-label="Meu perfil" className="flex flex-col bg-surface-card pt-4 pb-2 lg:self-start">
          <h2 className="px-2.5 pb-2 text-title font-bold text-cream">Meu perfil</h2>
          <Link to="/perfil" className={item(active === "profile")} aria-current={active === "profile" ? "page" : undefined}>
            Dados do perfil
          </Link>
          <Link to="/carteiras" className={item(active === "wallets")} aria-current={active === "wallets" ? "page" : undefined}>
            Carteiras
          </Link>
          {disabledItems.map((label) => (
            <span key={label} aria-disabled className="hidden h-11 items-center border-l-[5px] border-transparent px-4 text-body text-brand-muted lg:flex">
              {label}
            </span>
          ))}
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="mt-1 flex h-11 items-center gap-3 border-t border-line px-4 text-left text-body font-bold text-amber hover:text-cream"
          >
            {logout.isPending ? "Saindo…" : "Sair"}
          </button>
        </nav>
        <section aria-labelledby="account-title" className="flex flex-col gap-6">
          <h1 id="account-title" className="text-body-lg font-bold text-cream">
            {title}
          </h1>
          {children}
        </section>
      </div>
    </PageShell>
  )
}
