import { placeholderCartCount } from "@/lib/placeholder-data"
import { cn } from "@/lib/utils"

import { MobileTabBar, type MobileTab } from "./mobile-tab-bar"
import { SiteFooter } from "./site-footer"
import { SiteHeader, type NavSection } from "./site-header"

interface PageShellProps {
  nav: NavSection
  /** As telas Início, Login, Cadastro, Perfil e Carteiras usam o cabeçalho com divisor. */
  headerDivider?: boolean
  /** Aba ativa na barra inferior mobile; `null` oculta a barra (telas com barra de ação própria). */
  mobileTab?: MobileTab | null
  children: React.ReactNode
  className?: string
}

/**
 * Moldura das telas: 1440 px com 120 px de margem lateral no desktop (Figma) e 24 px no mobile.
 */
export function PageShell({ nav, headerDivider = false, mobileTab = "home", children, className }: PageShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-6 pt-10 pb-[150px] lg:px-[120px] lg:py-6">
      <SiteHeader active={nav} cartCount={placeholderCartCount} withDivider={headerDivider} className="mb-8" />
      <main id="conteudo" className={cn("flex w-full flex-1 flex-col", className)}>
        {children}
      </main>
      <SiteFooter className="mt-24" />
      {mobileTab !== null && <MobileTabBar active={mobileTab} />}
    </div>
  )
}
