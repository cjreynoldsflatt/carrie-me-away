'use client'

import { useAppStore } from '@/lib/store'
import type { LayerSettings } from '@/lib/types'
import { cn } from '@/lib/utils'

const LAYERS: { key: keyof LayerSettings; label: string }[] = [
  { key: 'forSale', label: 'For Sale' },
  { key: 'forRent', label: 'For Rent' },
  { key: 'investmentScore', label: 'Yield on Map' },
]

export default function LayerToggles() {
  const layers = useAppStore((s) => s.layers)
  const setLayer = useAppStore((s) => s.setLayer)

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {LAYERS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setLayer(key, !layers[key])}
          className={cn(
            'text-xs px-2.5 h-7 rounded-lg border transition-colors whitespace-nowrap',
            layers[key]
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
