import { errorMessage } from "@/lib/error-message"
import { cn } from "@/lib/utils"

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-start gap-2 text-body text-danger", className)}>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-sm border border-brand px-3 py-1.5 text-amber hover:bg-surface-card">
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="text-body text-sand">
      {label}
    </p>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-caption text-danger">
      {message}
    </p>
  )
}
