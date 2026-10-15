import { Link } from "@tanstack/react-router"

import { PageShell } from "@/components/layout/page-shell"
import { cn } from "@/lib/utils"

export function AuthCard({ mode, redirect, intro, children }: { mode: "login" | "register"; redirect?: string; intro: string; children: React.ReactNode }) {
  return (
    <PageShell nav="home" headerDivider mobileTab="profile">
      <section aria-labelledby="auth-title" className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-6 py-6 lg:border-b-[10px] lg:border-brand lg:bg-surface-card lg:px-20 lg:py-14">
        <p className="text-[36px] font-bold tracking-[0.1em] text-cream lg:hidden" aria-hidden>
          KURIO
        </p>
        <h1 id="auth-title" className="sr-only">
          {mode === "login" ? "Entrar" : "Criar perfil de colecionador"}
        </h1>
        <nav aria-label="Acesso" className="hidden items-center gap-2 text-title lg:flex">
          <Link to="/entrar" search={{ redirect }} className={cn(mode === "login" ? "text-amber" : "text-cream hover:text-amber")} aria-current={mode === "login" ? "page" : undefined}>
            Entrar
          </Link>
          <span aria-hidden className="h-5 w-px bg-brand" />
          <Link to="/cadastro" search={{ redirect }} className={cn(mode === "register" ? "text-amber" : "text-cream hover:text-amber")} aria-current={mode === "register" ? "page" : undefined}>
            Criar conta
          </Link>
        </nav>
        <p className="text-center text-body font-bold text-cream lg:text-caption lg:font-normal">{intro}</p>
        {children}
      </section>
    </PageShell>
  )
}
