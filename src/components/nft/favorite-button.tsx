import { cn } from "@/lib/utils"

interface FavoriteButtonProps {
  nftName: string
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  className?: string
}

export function FavoriteButton({ nftName, pressed = false, onPressedChange, className }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={pressed ? `Remover ${nftName} dos favoritos` : `Favoritar ${nftName}`}
      onClick={() => onPressedChange?.(!pressed)}
      className={cn("relative z-10 size-7 rounded-full", className)}
    >
      <img src="/assets/icons/favorite-button.svg" alt="" width={28} height={28} className="block size-7" />
    </button>
  )
}
