import { cn } from "@/lib/utils"

const features = [
  {
    letter: "W",
    title: "Segurança da carteira",
    text: "Proteja sua carteira e colecione arte digital verificada com confiança.",
  },
  {
    letter: "C",
    title: "Criadores em destaque",
    text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
  },
  {
    letter: "D",
    title: "Alertas de lançamentos",
    text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
  },
]

const linkColumns = [
  {
    title: "Meu perfil",
    links: ["Meu perfil", "Minha coleção", "Atividade", "Estúdio do criador", "Lista de interesse"],
  },
  {
    title: "Central de ajuda",
    links: ["Central de ajuda", "Como comprar NFTs", "Carteira e segurança", "Política do mercado", "Denunciar item"],
  },
  {
    title: "Coleções",
    links: ["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"],
  },
]

const socials = [
  { icon: "social-1", label: "Facebook" },
  { icon: "social-2", label: "Instagram" },
  { icon: "social-3", label: "Twitter" },
  { icon: "social-4", label: "LinkedIn" },
  { icon: "social-5", label: "YouTube" },
]

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("flex w-full flex-col", className)}>
      <div className="flex w-full flex-col gap-8 bg-surface-card p-8 lg:h-[250px] lg:flex-row lg:items-end lg:gap-0">
        <div className="grid flex-1 gap-8 sm:grid-cols-3 lg:flex lg:gap-0">
          {features.map((feature, index) => (
            <div key={feature.letter} className="flex lg:flex-1">
              {index > 0 && <span aria-hidden className="hidden w-px self-stretch bg-brand lg:block" />}
              <div className="flex flex-col gap-3 lg:px-4">
                <span
                  aria-hidden
                  className="grid size-[74px] place-items-center rounded-full bg-brand text-heading leading-none font-bold text-ink"
                >
                  {feature.letter}
                </span>
                <h2 className="text-lead font-bold text-cream">{feature.title}</h2>
                <p className="max-w-[204px] text-body leading-5.5 text-sand">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>

        <span aria-hidden className="hidden w-px self-stretch bg-brand lg:block" />

        <NewsletterSignup />
      </div>

      <div className="flex w-full flex-col gap-4 bg-surface-dark px-8 py-6 text-body leading-5.5 text-cream lg:h-[88px] lg:flex-row lg:items-center lg:gap-[92px] lg:py-8 lg:whitespace-nowrap">
        <p className="flex-1 py-2 text-body font-bold leading-none tracking-[1.4px]">KURIO</p>
        <p className="flex-1">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <p className="flex-1">
          <a href="mailto:contato@email.com" className="rounded-xs hover:text-amber">
            contato@email.com
          </a>
        </p>
        <p className="lg:w-[228px]">
          <a href="tel:+551140028922" className="rounded-xs hover:text-amber">
            +55 11 4002 8922
          </a>
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="w-full bg-surface-card p-8 lg:h-[236px]">
          <div className="grid gap-8 sm:grid-cols-2 lg:flex lg:gap-[124px]">
            {linkColumns.map((column) => (
              <nav key={column.title} aria-label={column.title} className="flex flex-1 flex-col gap-2 text-cream">
                <h2 className="text-title font-bold">{column.title}</h2>
                <ul className="text-body leading-7.5">
                  {column.links.map((link) => (
                    <li key={link}>
                      <span aria-disabled="true" title="Em breve" className="cursor-not-allowed">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div className="flex flex-col gap-8 lg:w-[228px]">
              <div className="flex w-[190px] flex-col gap-5">
                <h2 className="text-title font-bold text-cream">Redes sociais</h2>
                <ul className="flex items-center gap-2.5">
                  {socials.map((social) => (
                    <li key={social.icon}>
                      <a
                        href="#"
                        aria-label={`${social.label} (em breve)`}
                        aria-disabled="true"
                        onClick={(event) => event.preventDefault()}
                        className="relative block size-[30px] cursor-not-allowed rounded-xs"
                      >
                        <span className="absolute inset-[-3.33%]">
                          <img src={`/assets/icons/${social.icon}.svg`} alt="" className="block size-full max-w-none" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="text-title font-bold text-cream">Carteiras compatíveis</h2>
                <p className="flex h-[26px] items-center justify-center rounded-sm border border-line-soft bg-surface-dark pl-2 text-tiny font-bold tracking-[0.1px] whitespace-pre text-amber">
                  {"METAMASK  •  WALLETCONNECT  •  COINBASE"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-body leading-7.5 text-cream">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}

function NewsletterSignup() {
  return (
    <form
      className="flex flex-col gap-3 lg:h-full lg:w-[357px] lg:px-4"
      onSubmit={(event) => event.preventDefault()}
      aria-labelledby="newsletter-title"
    >
      <div className="flex flex-col gap-4">
        <h2 id="newsletter-title" className="text-title font-bold text-cream">
          Antecipe-se ao próximo lançamento
        </h2>
        <div className="flex h-10 items-center justify-between rounded-sm bg-surface-dark pl-3 shadow-field">
          <label htmlFor="newsletter-email" className="sr-only">
            E-mail
          </label>
          <input
            id="newsletter-email"
            type="email"
            placeholder="digite seu e-mail..."
            className="min-w-0 flex-1 bg-transparent text-body text-cream outline-none placeholder:text-brand-muted"
          />
          <button
            type="submit"
            className="flex h-10 w-[85px] items-center justify-center rounded-r-sm bg-brand pr-1 pl-4 text-title font-bold text-ink hover:bg-amber"
          >
            Enviar
          </button>
        </div>
      </div>
      <p className="text-caption-lg text-sand lg:h-[89px]">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}
