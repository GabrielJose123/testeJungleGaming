import { cn } from "@/lib/utils"

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange?: (page: number) => void
  className?: string
}

/** Figma: "Pagination" — quadrados de 35 px, página atual preenchida. */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)
  const isLast = page >= pageCount

  return (
    <nav aria-label="Paginação" className={cn("flex items-center gap-2", className)}>
      {pages.map((value) => {
        const current = value === page
        return (
          <button
            key={value}
            type="button"
            aria-label={`Página ${value}`}
            aria-current={current ? "page" : undefined}
            onClick={() => onPageChange?.(value)}
            className={cn(
              "grid size-[35px] place-items-center rounded-xs text-title",
              current ? "bg-brand font-bold text-ink" : "border border-line text-cream hover:border-brand",
            )}
          >
            {value}
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Próxima página"
        disabled={isLast}
        onClick={() => onPageChange?.(page + 1)}
        className="grid size-[35px] place-items-center rounded-xs border border-line hover:border-brand disabled:opacity-40"
      >
        <img src="/assets/icons/arrow-right-2.svg" alt="" width={12} height={7} className="-rotate-90" />
      </button>
    </nav>
  )
}
