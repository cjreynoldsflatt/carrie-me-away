'use client'

import { fmtPrice, fmtRent, fmtYield } from '@/lib/format'
import type { SaleListing } from '@/lib/types'

interface Props {
  listing: SaleListing
  selected: boolean
  showScore: boolean
  onClick: () => void
}

export default function SaleMarker({ listing, selected, showScore, onClick }: Props) {
  const s = listing.investmentScore

  // Color by investment score (matches grade circle)
  const color =
    s >= 70 ? 'bg-emerald-600 border-emerald-700'
    : s >= 57 ? 'bg-cyan-600 border-cyan-700'
    : s >= 44 ? 'bg-blue-600 border-blue-700'
    : s >= 32 ? 'bg-orange-400 border-orange-500'
    : s >= 20 ? 'bg-orange-600 border-orange-700'
    : 'bg-red-600 border-red-700'

  const ringClass = selected ? 'ring-2 ring-offset-1 ring-yellow-400 scale-110' : ''

  return (
    <button
      onClick={onClick}
      className={`
        ${color} ${ringClass}
        text-white rounded-lg border shadow-md cursor-pointer
        transition-transform hover:scale-105 hover:shadow-lg
        min-w-[90px] text-left
        ${selected ? 'z-50' : 'z-10'}
      `}
      style={{ transform: selected ? 'translateY(-4px)' : undefined }}
    >
      <div className="px-2 py-1.5 space-y-0.5">
        <div className="text-xs font-bold leading-none">{fmtPrice(listing.price)}</div>
        <div className="text-[10px] opacity-90 leading-none">{fmtRent(listing.estimatedRent)}</div>
        {showScore && (
          <div className="text-[10px] font-semibold leading-none opacity-95">
            {fmtYield(listing.netCashYield)}
          </div>
        )}
      </div>
      {/* Pointer triangle */}
      <div
        className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-1.5 overflow-hidden`}
        aria-hidden
      >
        <div
          className={`w-3 h-3 rotate-45 ${color} border-r border-b translate-y-[-6px]`}
        />
      </div>
    </button>
  )
}
