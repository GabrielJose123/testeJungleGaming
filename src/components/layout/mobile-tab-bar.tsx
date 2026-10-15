import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

export type MobileTab = "home" | "favorites" | "cart" | "profile"

interface MobileTabBarProps {
  active?: MobileTab
  className?: string
}

/**
 * Figma: "Tab Bar" do frame Mobile / Início. As posições em % reproduzem o frame de 414 px;
 * o fundo (SVG com recorte para o botão central) estica na horizontal em telas mais largas.
 */
export function MobileTabBar({ active = "home", className }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[126px] lg:hidden", className)}
    >
      <div aria-hidden className="absolute inset-[24.6%_0_0.04%_0]">
        <div className="absolute inset-[-42.13%_-7.25%_-21.06%_-7.25%]">
          <img src="/assets/icons/tabbar-bg.svg" alt="" className="block size-full max-w-none" />
        </div>
      </div>

      <TabLink to="/" label="Início" current={active === "home"} className="inset-[56.35%_86.47%_27.78%_8.7%]">
        <span className="absolute inset-[8.33%_10.42%]">
          <img src="/assets/icons/home.svg" alt="" className="block size-full max-w-none" />
        </span>
      </TabLink>

      <TabLink
        to="/perfil"
        label="Favoritos"
        current={active === "favorites"}
        className="inset-[57.14%_69.08%_28.74%_26.09%]"
      >
        <img src="/assets/icons/heart.svg" alt="" className="block size-full max-w-none" />
      </TabLink>

      <button
        type="button"
        aria-label="Escanear NFT (em breve)"
        aria-disabled="true"
        title="Em breve"
        className="pointer-events-auto absolute top-0 left-1/2 size-[65px] -translate-x-1/2 cursor-not-allowed rounded-full"
      >
        <img src="/assets/icons/tabbar-fab.svg" alt="" className="absolute inset-0 block size-full max-w-none" />
        <span aria-hidden className="absolute top-[21px] left-[19px] h-6 w-[26.8px]">
          <ScanGlyph />
        </span>
      </button>

      <TabLink
        to="/carrinho"
        label="Carrinho"
        current={active === "cart"}
        className="inset-[56.35%_24.64%_27.78%_70.53%]"
      >
        <img src="/assets/icons/shop.svg" alt="" className="block size-full max-w-none" />
      </TabLink>

      <TabLink to="/perfil" label="Perfil" current={active === "profile"} className="inset-[56.35%_9.66%_27.78%_85.51%]">
        <img src="/assets/icons/user.svg" alt="" className="block size-full max-w-none" />
      </TabLink>
    </nav>
  )
}

function TabLink({
  to,
  label,
  current,
  className,
  children,
}: {
  to: "/" | "/carrinho" | "/perfil"
  label: string
  current: boolean
  className: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={cn("pointer-events-auto absolute rounded-xs", className)}
    >
      {children}
    </Link>
  )
}

/** Ícone de leitura: os 5 vetores do Figma, com posições relativas ao grupo original (26.8 × 24). */
const scanParts = [
  { src: "scan-1", inset: "46.3% 0 46.3% 0" },
  { src: "scan-2", inset: "57% 56.5% 0 5%" },
  { src: "scan-3", inset: "0.3% 4.9% 56.7% 56.4%" },
  { src: "scan-4", inset: "57.1% 5.1% 0.2% 56.4%" },
  { src: "scan-5", inset: "0 56.3% 57% 5%" },
]

function ScanGlyph() {
  return (
    <>
      {scanParts.map((part) => (
        <span key={part.src} className="absolute" style={{ inset: part.inset }}>
          <img src={`/assets/icons/${part.src}.svg`} alt="" className="block size-full max-w-none" />
        </span>
      ))}
    </>
  )
}
