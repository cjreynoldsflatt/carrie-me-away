'use client'

import { fmtRent } from '@/lib/format'
import type { RentalListing } from '@/lib/types'

interface Props {
  listing: RentalListing
  onClick: () => void
  isPopupOpen: boolean
}

export default function RentalMarker({ listing, onClick, isPopupOpen }: Props) {
  return (
    <button
      onClick={onClick}
      title={listing.address}
      className={`
        rounded-full border-2 text-[10px] font-semibold
        bg-amber-50 border-amber-400 text-amber-800
        shadow px-2 py-0.5 cursor-pointer whitespace-nowrap
        transition-transform hover:scale-105
        ${isPopupOpen ? 'ring-2 ring-amber-500 scale-105' : ''}
      `}
    >
      {fmtRent(listing.monthlyRent)}
    </button>
  )
}
