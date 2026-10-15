import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

export type NavSection = "home" | "market"

interface SiteHeaderProps {
  /** Item ativo da navegação: "home" (Início) ou "market" (Mercado). */
  active: NavSection
  cartCount: number
  /** Linha fina sob o cabeçalho; as telas do fluxo de mercado usam o cabeçalho sem ela. */
  withDivider?: boolean
  className?: string
}

/** Figma: "Header With Divider" / "Header Row" (desktop, 1200 px). */
export function SiteHeader({ active, cartCount, withDivider = false, className }: SiteHeaderProps) {
  return (
    <header className={cn("hidden w-full lg:block", className)}>
      <div className="flex w-full items-start justify-between">
        <Link to="/" className="h-[34.3px] w-40 pt-[8.15px] text-body font-bold leading-none tracking-[1.4px]">
          KURIO
        </Link>

        <nav aria-label="Principal" className="flex items-start gap-10">
          <NavItem to="/" label="Início" active={active === "home"} />
          <NavItem to="/" hash="catalogo" label="Mercado" active={active === "market"} />
          <UnavailableNavItem label="Criadores" />
          <UnavailableNavItem label="Aprenda" />
        </nav>

        <div className="flex items-center gap-7">
          <button type="button" aria-label="Buscar" className="size-5 rounded-xs">
            <img src="/assets/icons/search.svg" alt="" width={20} height={20} className="size-5" />
          </button>

          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? "item" : "itens"}`}
            className="relative grid size-6 place-items-start rounded-xs"
          >
            <img src="/assets/icons/cart.svg" alt="" width={24} height={24} className="col-1 row-1 size-6" />
            <span className="relative col-1 row-1 ml-[15px] grid size-4 place-items-center">
              <img src="/assets/icons/cart-badge.svg" alt="" className="absolute -inset-[12.5%] size-5 max-w-none" />
              <span className="relative text-micro font-medium text-ink">{cartCount}</span>
            </span>
          </Link>

          <Link
            to="/entrar"
            className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-sm bg-brand text-body-lg leading-none font-medium text-ink transition-colors hover:bg-amber"
          >
            <img src="/assets/icons/logout.svg" alt="" width={18} height={17} className="size-5 p-[2px]" />
            Entrar
          </Link>
        </div>
      </div>
      {withDivider && <div aria-hidden className="h-[0.3px] w-full bg-brand" />}
    </header>
  )
}

function NavItem({ to, hash, label, active }: { to: "/"; hash?: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      hash={hash}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col gap-6 text-body-lg leading-none",
        active ? "font-bold text-amber" : "text-cream hover:text-amber",
      )}
    >
      {label}
      <span aria-hidden className={cn("h-[3px] w-full", active ? "bg-brand" : "bg-transparent")} />
    </Link>
  )
}

/** Seções editoriais estão fora do escopo: o item aparece, mas não navega. */
function UnavailableNavItem({ label }: { label: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className="cursor-not-allowed text-body-lg leading-none text-cream">
      {label}
    </span>
  )
}
