import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { FilterOption, PriceRange } from "@/types/catalog"

interface CatalogFiltersProps {
  collections: FilterOption[]
  networks: FilterOption[]
  selectedCollections: string[]
  selectedNetworks: string[]
  priceBounds: PriceRange
  priceRange: PriceRange
  onToggleCollection?: (id: string) => void
  onToggleNetwork?: (id: string) => void
  onPriceRangeChange?: (range: PriceRange) => void
  onApplyPrice?: () => void
  className?: string
}

const formatEth = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function CatalogFilters({
  collections,
  networks,
  selectedCollections,
  selectedNetworks,
  priceBounds,
  priceRange,
  onToggleCollection,
  onToggleNetwork,
  onPriceRangeChange,
  onApplyPrice,
  className,
}: CatalogFiltersProps) {
  return (
    <div className={cn("flex flex-col gap-10 bg-surface-card p-5", className)}>
      <FilterGroup title="Coleções" className="[&_ul]:px-3">
        {collections.map((option) => (
          <FilterRow
            key={option.id}
            option={option}
            selected={selectedCollections.includes(option.id)}
            onToggle={onToggleCollection}
          />
        ))}
      </FilterGroup>

      <section aria-labelledby="filtro-preco" className="flex flex-col gap-3">
        <h2 id="filtro-preco" className="text-title font-bold text-cream">
          Faixa de preço
        </h2>
        <div className="flex flex-col gap-3 pl-3">
          <Slider
            aria-label="Faixa de preço"
            min={priceBounds.min}
            max={priceBounds.max}
            step={0.01}
            value={[priceRange.min, priceRange.max]}
            onValueChange={([min, max]) => onPriceRangeChange?.({ min, max })}
            className="py-1.5 [&_[data-slot=slider-range]]:bg-brand [&_[data-slot=slider-thumb]]:size-[21px] [&_[data-slot=slider-thumb]]:border-[3px] [&_[data-slot=slider-thumb]]:border-ink [&_[data-slot=slider-thumb]]:bg-brand [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-brand"
          />
          <p className="text-body-md leading-normal text-cream">
            Preço: {formatEth(priceRange.min)} - {formatEth(priceRange.max)} ETH
          </p>
          <button
            type="button"
            onClick={onApplyPrice}
            className="self-start rounded-sm bg-brand px-3 py-2 text-body-lg leading-5 font-bold text-ink hover:bg-amber"
          >
            Aplicar
          </button>
        </div>
      </section>

      <FilterGroup title="Rede" className="[&_ul]:pl-3">
        {networks.map((option) => (
          <FilterRow
            key={option.id}
            option={option}
            selected={selectedNetworks.includes(option.id)}
            onToggle={onToggleNetwork}
            boldCount={false}
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  const id = `filtro-${title.toLowerCase()}`
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3", className)}>
      <h2 id={id} className="text-title font-bold text-cream">
        {title}
      </h2>
      <ul>{children}</ul>
    </section>
  )
}

function FilterRow({
  option,
  selected,
  onToggle,
  boldCount = true,
}: {
  option: FilterOption
  selected: boolean
  onToggle?: (id: string) => void
  boldCount?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onToggle?.(option.id)}
        className={cn(
          "flex w-full items-start justify-between rounded-xs text-body-md leading-10",
          selected ? "text-amber" : "text-sand hover:text-cream",
        )}
      >
        <span className={cn(selected && "underline decoration-1 underline-offset-4")}>{option.label}</span>
        <span className={cn(boldCount && "font-bold")}>({option.count})</span>
      </button>
    </li>
  )
}
