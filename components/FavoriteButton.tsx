'use client'

// Star toggle for a listing; stopPropagation so it doesn't also open/select the card
import { Star } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

// readOnly (Realtor Version): shows the star when starred, but it can't be toggled
export default function FavoriteButton({ id, isFavorite, size = 18, className, readOnly = false }: {
  id: string; isFavorite?: boolean; size?: number; className?: string; readOnly?: boolean
}) {
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  if (readOnly) {
    return isFavorite ? (
      <span className={cn('flex items-center justify-center text-amber-400', className)} title="Favorite" aria-label="Favorite">
        <Star size={size} fill="currentColor" strokeWidth={1.5} />
      </span>
    ) : null
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleFavorite(id) }}
      className={cn('rounded-lg flex items-center justify-center transition-colors', isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-400', className)}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={!!isFavorite}
    >
      <Star size={size} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 1.5 : 2} />
    </button>
  )
}
