import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import type { PromoCard } from "@/types/catalog"

export function PromoCards({ promos, className }: { promos: PromoCard[]; className?: string }) {
  return (
    <section aria-label="Coleções em destaque" className={cn("grid gap-7 lg:grid-cols-2", className)}>
      {promos.map((promo) => (
        <PromoCardItem key={promo.id} promo={promo} />
      ))}
    </section>
  )
}

function PromoCardItem({ promo }: { promo: PromoCard }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-md bg-surface-card sm:h-[250px] sm:flex-row">
      <img
        src={promo.image}
        alt=""
        width={292}
        height={250}
        loading="lazy"
        className="h-[180px] w-full shrink-0 rounded-[18px] object-cover sm:-ml-[5px] sm:h-full sm:w-[292px]"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start px-5 pt-5 pb-5 text-left sm:items-end sm:pt-[37px] sm:pr-[30px] sm:pb-0 sm:pl-0 sm:text-right">
        <h2 className="relative text-title leading-6 font-bold text-cream sm:whitespace-nowrap">
          {promo.title[0]}
          <br />
          {promo.title[1]}
        </h2>
        <p className="mt-[9px] max-w-[263px] text-body leading-6 text-sand">{promo.description}</p>
        <Link
          to="/"
          hash="catalogo"
          className="mt-4 flex h-10 sm:mt-auto sm:mb-[46px] w-[140px] items-center justify-center gap-1 rounded-sm bg-brand text-body leading-5 font-medium text-ink hover:bg-amber"
        >
          {promo.ctaLabel}
          <span className="relative size-[18px]">
            <span className="absolute inset-[23.76%_17.71%_26.04%_19.79%] flex items-center justify-center">
              <img src="/assets/icons/arrow-right.svg" alt="" className="block h-[11px] w-[9px] max-w-none -rotate-90" />
            </span>
          </span>
        </Link>
      </div>
      <img
        src="/assets/icons/promo-mask.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden size-full max-w-none sm:block"
      />
    </article>
  )
}
