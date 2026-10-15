import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Option {
  id: string
  label: string
}

interface CatalogTabsProps {
  tabs: readonly Option[]
  activeTab: string
  onTabChange?: (id: string) => void
  className?: string
}

/** Figma: "Tabs" — o ativo em `amber` com sublinhado de 2 px. */
export function CatalogTabs({ tabs, activeTab, onTabChange, className }: CatalogTabsProps) {
  return (
    <div role="group" aria-label="Seção do catálogo" className={cn("flex items-start gap-4 lg:gap-5", className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              "flex flex-col gap-1 rounded-xs text-body whitespace-nowrap lg:gap-[7px] lg:text-body-md lg:font-medium",
              active ? "font-bold text-amber" : "text-cream hover:text-amber",
            )}
          >
            {tab.label}
            <span aria-hidden className={cn("h-0.5 w-full", active ? "bg-brand" : "bg-transparent")} />
          </button>
        )
      })}
    </div>
  )
}

interface SortSelectProps {
  options: readonly Option[]
  value: string
  onValueChange?: (id: string) => void
  className?: string
}

/** Figma: "Sort" — "Ordenar por: Listados recentemente" com seta para baixo. */
export function SortSelect({ options, value, onValueChange, className }: SortSelectProps) {
  return (
    <div className={cn("flex items-center gap-2 text-body-md leading-normal text-cream", className)}>
      <span id="ordenar-label">Ordenar por:</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-labelledby="ordenar-label"
          className="h-auto gap-2 border-0 bg-transparent p-0 text-body-md text-cream shadow-none hover:text-amber focus-visible:ring-0 dark:bg-transparent [&>svg]:hidden"
        >
          <SelectValue />
          <img src="/assets/icons/arrow-down-2.svg" alt="" width={11} height={6} className="ml-1.5" />
        </SelectTrigger>
        <SelectContent align="end">
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
