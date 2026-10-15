import { PageShell } from "./page-shell"
import type { NavSection } from "./site-header"

/** Rota provisória até a tela correspondente ser implementada. */
export function ScreenPlaceholder({ title, nav = "market" }: { title: string; nav?: NavSection }) {
  return (
    <PageShell nav={nav}>
      <h1 className="py-24 text-center text-heading font-bold text-cream">{title}</h1>
      <p className="text-center text-body text-sand">Tela em construção.</p>
    </PageShell>
  )
}
