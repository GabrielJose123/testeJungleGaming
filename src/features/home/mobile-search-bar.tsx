import { cn } from "@/lib/utils"

interface MobileSearchBarProps {
  value?: string
  onValueChange?: (value: string) => void
  /** Botão de filtros ao lado da busca (abre o painel). */
  filterTrigger: React.ReactNode
  className?: string
}

/** Figma: "Search Bar" do frame Mobile / Início — campo de 45 px + botão de filtros. */
export function MobileSearchBar({ value, onValueChange, filterTrigger, className }: MobileSearchBarProps) {
  return (
    <div role="search" className={cn("flex h-[45px] gap-2", className)}>
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-card px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber">
        <img src="/assets/icons/search-mobile.svg" alt="" width={22} height={22} className="size-[22px] shrink-0" />
        <span className="sr-only">Buscar NFTs</span>
        <input
          type="search"
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder="Explorar coleções"
          className="min-w-0 flex-1 bg-transparent text-body font-bold text-cream outline-none placeholder:text-brand-muted"
        />
      </label>
      {filterTrigger}
    </div>
  )
}

export function FilterIconButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label="Filtros"
      className={cn("relative size-[45px] shrink-0 rounded-[14px] bg-brand-gradient", className)}
      {...props}
    >
      <span className="absolute inset-3">
        <span className="absolute inset-[19.46%_13.96%_14.14%_19.46%]">
          <span className="absolute inset-[-5.14%_-5.12%_-5.13%_-5.12%]">
            <img src="/assets/icons/filter.svg" alt="" className="block size-full max-w-none" />
          </span>
        </span>
      </span>
    </button>
  )
}
