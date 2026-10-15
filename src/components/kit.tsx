import { Link } from "@tanstack/react-router"
import { useId, useState } from "react"

import { cn } from "@/lib/utils"

import { buttonStyles } from "./kit-styles"

/**
 * Peças visuais compartilhadas pelas telas internas (Detalhe, Carrinho, Pagamento, Perfil,
 * Carteiras, Login e Cadastro), extraídas das capturas do Figma em docs/figma-export.
 */

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-3 text-body font-bold text-cream">
      <ol className="flex flex-wrap gap-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex gap-1">
            {index > 0 && <span aria-hidden>/</span>}
            {item.to ? (
              <Link to={item.to} className="hover:text-amber">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Título de seção em laranja com linha inferior ("Mais desta coleção"). */
export function SectionHeading({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("border-b border-line pb-2 text-body-lg font-bold text-amber", className)}>
      {children}
    </h2>
  )
}

const { primary, outline } = buttonStyles

export function PrimaryButton({ className, ...props }: React.ComponentProps<"button">) {
  return <button type="button" className={cn(primary, "h-10 text-body", className)} {...props} />
}

export function OutlineButton({ className, ...props }: React.ComponentProps<"button">) {
  return <button type="button" className={cn(outline, "h-10 text-body", className)} {...props} />
}

const fieldBase =
  "h-10 w-full rounded-xs border border-line-soft bg-transparent px-4 text-body text-cream placeholder:text-brand-muted focus-visible:border-brand focus-visible:outline-none aria-invalid:border-danger"

interface TextFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
  label: string
  /** Rótulo visível (desktop do Perfil) ou só para leitores de tela (Login/Cadastro, que usam placeholder). */
  hideLabel?: boolean
  required?: boolean
  error?: string
  inputClassName?: string
}

/** Campo com rótulo, erro associado e botão de mostrar/ocultar senha. */
export function TextField({ label, hideLabel = false, required, error, className, inputClassName, type = "text", ...props }: TextFieldProps) {
  const id = useId()
  const [reveal, setReveal] = useState(false)
  const isPassword = type === "password"
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label htmlFor={id} className={cn("text-body text-cream", hideLabel && "sr-only")}>
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(fieldBase, isPassword && "pr-12", inputClassName)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={reveal}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-xs p-1 text-brand-muted hover:text-amber"
          >
            <EyeIcon off={!reveal} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

/** Botão redondo laranja de quantidade (− / +) usado no Detalhe e no Carrinho. */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  label,
  size = "lg",
}: {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  disabled?: boolean
  label: string
  size?: "sm" | "lg"
}) {
  const button = cn(
    "flex items-center justify-center rounded-full bg-brand text-ink hover:bg-amber disabled:cursor-not-allowed disabled:opacity-40",
    size === "lg" ? "h-10 w-7 text-title" : "h-6 w-[18px] text-body",
  )
  return (
    <div role="group" aria-label={`Quantidade de ${label}`} className="flex items-center gap-3">
      <button type="button" className={button} aria-label="Diminuir quantidade" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite" className="min-w-4 text-center text-body-lg text-cream">
        {value}
      </output>
      <button type="button" className={button} aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

/** Linha "Ou continue com" + botões sociais (decorativos: o desafio não tem OAuth). */
export function SocialLogin() {
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="flex items-center gap-3 text-caption text-cream before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        Ou continue com
      </p>
      {["Google", "Facebook"].map((provider) => (
        <button
          key={provider}
          type="button"
          disabled
          title="Login social indisponível na demonstração"
          className="flex h-10 items-center justify-center gap-2 rounded-xs border border-line text-caption text-sand disabled:cursor-not-allowed"
        >
          <span aria-hidden className={cn("font-bold", provider === "Google" ? "text-amber" : "text-[#3b5998]")}>
            {provider[0]}
          </span>
          Continuar com {provider}
        </button>
      ))}
    </div>
  )
}

/** Moldura com o shimmer usado nos estados de carregamento. */
export function Shimmer({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xs bg-surface-card", className)} />
}
