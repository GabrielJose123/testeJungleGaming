import { PageShell } from "./page-shell"
import type { NavSection } from "./site-header"

export function ScreenPlaceholder({
  title,
  nav = "market",
  children,
}: {
  title: string
  nav?: NavSection
  children?: React.ReactNode
}) {
  return (
    <PageShell nav={nav}>
      <section aria-labelledby="page-title" className="mx-auto flex w-full max-w-xl flex-col gap-4 py-12 text-body leading-6 text-sand">
        <h1 id="page-title" className="text-heading font-bold text-cream">
          {title}
        </h1>
        {children ?? <p>Tela em construção.</p>}
      </section>
    </PageShell>
  )
}
