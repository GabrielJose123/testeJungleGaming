import { useCartCount } from "@/api/hooks/cart"
import { useSession } from "@/session/use-session"
import { cn } from "@/lib/utils"

import { MobileTabBar, type MobileTab } from "./mobile-tab-bar"
import { SiteFooter } from "./site-footer"
import { SiteHeader, type NavSection } from "./site-header"

interface PageShellProps {
  nav: NavSection
  headerDivider?: boolean
  mobileTab?: MobileTab | null
  children: React.ReactNode
  className?: string
}

export function PageShell({ nav, headerDivider = false, mobileTab = "home", children, className }: PageShellProps) {
  const cartCount = useCartCount()
  const userName = useSession()?.user.name
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col px-6 pt-10 pb-[150px] lg:px-[120px] lg:py-6">
      <SiteHeader active={nav} cartCount={cartCount} userName={userName} withDivider={headerDivider} className="mb-8" />
      <main id="conteudo" className={cn("flex w-full flex-1 flex-col", className)}>
        {children}
      </main>
      <SiteFooter className="mt-24" />
      {mobileTab !== null && <MobileTabBar active={mobileTab} />}
    </div>
  )
}
